'use strict';

/**
 * HTTP Cloud Function (Gen2): POST /api/submit-contact
 *
 * 1) Gmail API (Google Workspace)
 * 2) Fallback SMS: Telnyx (api.telnyx.com/v2/messages)
 * 3) Fallback final: Google Chat (webhook)
 */

const express = require('express');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const functions = require('@google-cloud/functions-framework');

function corsHeaders(req) {
  const origin = req.headers.origin || req.headers.Origin || '';
  const allowed = process.env.ALLOWED_ORIGIN || '*';
  if (allowed === '*') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    };
  }
  const list = allowed.split(',').map((s) => s.trim()).filter(Boolean);
  const allowOrigin = list.includes(origin) ? origin : list[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLeadPayload(body) {
  const name = (body.name || '').toString().trim().slice(0, 200);
  const phone = (body.phone || '').toString().trim().slice(0, 40);
  const address = (body.address || '').toString().trim().slice(0, 500);
  const message = (body.message || '').toString().trim().slice(0, 4000);
  if (!name || !phone || !address) {
    return { error: 'Name, phone, and address are required' };
  }
  const subject = `[Control Crest] New quote request from ${name}`;
  const plainText = [`Name: ${name}`, `Phone: ${phone}`, `Address: ${address}`, message ? `Message: ${message}` : '']
    .filter(Boolean)
    .join('\n');
  const html = `
    <h2>New lead — Control Crest landing</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Address:</strong> ${escapeHtml(address)}</p>
    ${message ? `<p><strong>Message:</strong></p><pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(message)}</pre>` : ''}
  `;
  return { name, phone, address, message, subject, plainText, html };
}

function getGmailJwt() {
  const raw = process.env.GMAIL_SERVICE_ACCOUNT_JSON;
  const impersonate = process.env.GMAIL_SEND_AS_USER;
  if (!raw || !impersonate) return null;
  let creds;
  try {
    creds = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!creds.client_email || !creds.private_key) return null;
  return new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    subject: impersonate
  });
}

async function sendGmail({ mailTo, subject, plainText, html }) {
  const jwt = getGmailJwt();
  if (!jwt) throw new Error('Gmail not configured');

  const gmail = google.gmail({ version: 'v1', auth: jwt });
  const boundary = 'boundary_' + Math.random().toString(36).slice(2);
  const mime = [
    `To: ${mailTo}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    plainText,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
    '',
    `--${boundary}--`
  ].join('\r\n');

  const raw = Buffer.from(mime, 'utf8').toString('base64url');
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });
}

async function sendTelnyx({ name, phone, address, message }, { isEmailFallback }) {
  const apiKey = process.env.TELNYX_API_KEY;
  const from = process.env.TELNYX_FROM_NUMBER;
  const to = process.env.TELNYX_TO_NUMBER;
  if (!apiKey || !from || !to) throw new Error('Telnyx not configured');

  const lines = [
    isEmailFallback ? 'Control Crest — e-mail falhou; SMS' : 'Control Crest — novo lead',
    `Nome: ${name}`,
    `Tel: ${phone}`,
    `End: ${address}`
  ];
  if (message) lines.push(`Msg: ${message}`);
  let text = lines.join('\n');
  if (text.length > 1200) text = text.slice(0, 1197) + '...';

  const res = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ from, to, text })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Telnyx HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
}

async function sendGoogleChat({ name, phone, address, message }, { isEmailFallback }) {
  const url = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!url) throw new Error('Chat webhook not configured');

  const title = isEmailFallback
    ? '*Control Crest — novo lead (e-mail falhou; alerta Chat)*'
    : '*Control Crest — novo lead*';
  const lines = [title, `*Nome:* ${name}`, `*Tel:* ${phone}`, `*Endereço:* ${address}`];
  if (message) lines.push(`*Mensagem:* ${message}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ text: lines.join('\n') })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Chat webhook HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
}

const app = express();
app.use(express.json({ limit: '64kb' }));

app.options('/api/submit-contact', (req, res) => {
  res.status(204).set(corsHeaders(req)).send();
});

app.post('/api/submit-contact', async (req, res) => {
  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' };

  const mailTo = process.env.MAIL_TO_ADDRESS;
  const hasGmail = !!(getGmailJwt() && mailTo);
  const hasTelnyx = !!(
    process.env.TELNYX_API_KEY &&
    process.env.TELNYX_FROM_NUMBER &&
    process.env.TELNYX_TO_NUMBER
  );
  const hasChat = !!process.env.GOOGLE_CHAT_WEBHOOK_URL;

  if (!hasGmail && !hasTelnyx && !hasChat) {
    console.error(
      'Configure Gmail and/or Telnyx (TELNYX_API_KEY, TELNYX_FROM_NUMBER, TELNYX_TO_NUMBER) and/or GOOGLE_CHAT_WEBHOOK_URL'
    );
    res.status(500).set(headers).json({ ok: false, error: 'Server configuration error' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      res.status(400).set(headers).json({ ok: false, error: 'Invalid JSON' });
      return;
    }
  }

  const lead = buildLeadPayload(body);
  if (lead.error) {
    res.status(400).set(headers).json({ ok: false, error: lead.error });
    return;
  }

  let emailErr = null;
  if (hasGmail) {
    try {
      await sendGmail({
        mailTo,
        subject: lead.subject,
        plainText: lead.plainText,
        html: lead.html
      });
      res.status(200).set(headers).json({ ok: true, channel: 'gmail' });
      return;
    } catch (err) {
      emailErr = err;
      console.error('Gmail send failed', err);
    }
  }

  let telnyxErr = null;
  if (hasTelnyx) {
    try {
      await sendTelnyx(
        {
          name: lead.name,
          phone: lead.phone,
          address: lead.address,
          message: lead.message
        },
        { isEmailFallback: !!emailErr }
      );
      res.status(200).set(headers).json({
        ok: true,
        channel: 'telnyx',
        fallback: emailErr ? true : undefined
      });
      return;
    } catch (err) {
      telnyxErr = err;
      console.error('Telnyx SMS failed', err);
    }
  }

  if (hasChat) {
    try {
      await sendGoogleChat(
        {
          name: lead.name,
          phone: lead.phone,
          address: lead.address,
          message: lead.message
        },
        { isEmailFallback: !!(emailErr || telnyxErr) }
      );
      res.status(200).set(headers).json({
        ok: true,
        channel: 'google_chat',
        fallback: true
      });
      return;
    } catch (err) {
      console.error('Google Chat send failed', err);
      res.status(502).set(headers).json({
        ok: false,
        error: 'Could not deliver message. Try again later.'
      });
      return;
    }
  }

  res.status(502).set(headers).json({
    ok: false,
    error: emailErr || telnyxErr ? 'Could not deliver message. Try again later.' : 'Could not deliver message.'
  });
});

functions.http('submitContact', app);
