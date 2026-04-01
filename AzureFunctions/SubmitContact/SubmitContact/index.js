'use strict';

const { EmailClient } = require('@azure/communication-email');

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

module.exports = async function (context, req) {
  const headers = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers };
    return;
  }

  const connectionString = process.env.ACS_CONNECTION_STRING;
  const mailFrom = process.env.MAIL_FROM_ADDRESS;
  const mailTo = process.env.MAIL_TO_ADDRESS;

  if (!connectionString || !mailFrom || !mailTo) {
    context.log.error('Missing ACS_CONNECTION_STRING, MAIL_FROM_ADDRESS, or MAIL_TO_ADDRESS');
    context.res = {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Server configuration error' })
    };
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      context.res = {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Invalid JSON' })
      };
      return;
    }
  }

  const name = (body.name || '').toString().trim().slice(0, 200);
  const phone = (body.phone || '').toString().trim().slice(0, 40);
  const address = (body.address || '').toString().trim().slice(0, 500);
  const message = (body.message || '').toString().trim().slice(0, 4000);

  if (!name || !phone || !address) {
    context.res = {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Name, phone, and address are required' })
    };
    return;
  }

  const subject = `[Control Crest] New quote request from ${name}`;
  const plainText = [
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Address: ${address}`,
    message ? `Message: ${message}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <h2>New lead — Control Crest landing</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Address:</strong> ${escapeHtml(address)}</p>
    ${message ? `<p><strong>Message:</strong></p><pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(message)}</pre>` : ''}
  `;

  try {
    const client = new EmailClient(connectionString);
    const poller = await client.beginSend({
      senderAddress: mailFrom,
      content: {
        subject,
        plainText,
        html
      },
      recipients: {
        to: [{ address: mailTo }]
      }
    });
    await poller.pollUntilDone();
    context.res = {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    context.log.error('Email send failed', err);
    context.res = {
      status: 502,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Could not send message. Try again later.' })
    };
  }
};

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
