'use strict';

const TELNYX_API_URL = 'https://api.telnyx.com/v2/messages';
const generatedConfig = loadGeneratedConfig();

function loadGeneratedConfig() {
  try {
    return require('./generated-config.json');
  } catch {
    return {};
  }
}

function resolveConfig(env = process.env) {
  return {
    ALLOWED_ORIGIN: env.ALLOWED_ORIGIN || generatedConfig.ALLOWED_ORIGIN || '*',
    TELNYX_API_KEY: env.TELNYX_API_KEY || generatedConfig.TELNYX_API_KEY || '',
    TELNYX_FROM_NUMBER: env.TELNYX_FROM_NUMBER || generatedConfig.TELNYX_FROM_NUMBER || ''
  };
}

function corsHeaders(req, env = process.env) {
  const origin = req.headers?.origin || req.headers?.Origin || '';
  const allowed = env.ALLOWED_ORIGIN || '*';
  if (allowed === '*') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    };
  }

  const list = allowed.split(',').map((item) => item.trim()).filter(Boolean);
  const allowOrigin = list.includes(origin) ? origin : list[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(status, headers, payload) {
  return {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  };
}

function parseBody(req) {
  if (typeof req.body === 'string') {
    return JSON.parse(req.body || '{}');
  }
  return req.body || {};
}

function buildSmsPayload(body) {
  const to = (body.to || '').toString().trim().slice(0, 40);
  const text = (body.text || body.message || '').toString().trim().slice(0, 1200);

  if (!to || !text) {
    return { error: 'Fields "to" and "text" are required' };
  }

  return { to, text };
}

async function sendTelnyxSms({ to, text }, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const apiKey = env.TELNYX_API_KEY;
  const from = env.TELNYX_FROM_NUMBER;

  if (!apiKey || !from) {
    throw new Error('Missing TELNYX_API_KEY or TELNYX_FROM_NUMBER');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('Fetch API is not available');
  }

  const response = await fetchImpl(TELNYX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ from, to, text })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Telnyx HTTP ${response.status}: ${details.slice(0, 300)}`);
  }

  const data = await response.json().catch(() => ({}));
  return {
    id: data?.data?.id || null
  };
}

async function handleRequest(context, req, deps = {}) {
  const env = resolveConfig(deps.env || process.env);
  const headers = corsHeaders(req, env);

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers };
    return;
  }

  if (!env.TELNYX_API_KEY || !env.TELNYX_FROM_NUMBER) {
    context.log.error('Missing TELNYX_API_KEY or TELNYX_FROM_NUMBER');
    context.res = jsonResponse(500, headers, { ok: false, error: 'Server configuration error' });
    return;
  }

  let body;
  try {
    body = parseBody(req);
  } catch {
    context.res = jsonResponse(400, headers, { ok: false, error: 'Invalid JSON' });
    return;
  }

  const sms = buildSmsPayload(body);
  if (sms.error) {
    context.res = jsonResponse(400, headers, { ok: false, error: sms.error });
    return;
  }

  try {
    const result = await sendTelnyxSms(sms, { env, fetchImpl: deps.fetchImpl });
    context.res = jsonResponse(200, headers, {
      ok: true,
      provider: 'telnyx',
      messageId: result.id
    });
  } catch (error) {
    context.log.error('Telnyx send failed', error);
    context.res = jsonResponse(502, headers, {
      ok: false,
      error: 'Could not send SMS. Try again later.'
    });
  }
}

module.exports = async function (context, req) {
  return handleRequest(context, req);
};

module.exports._internals = {
  TELNYX_API_URL,
  buildSmsPayload,
  corsHeaders,
  handleRequest,
  parseBody,
  resolveConfig,
  sendTelnyxSms
};