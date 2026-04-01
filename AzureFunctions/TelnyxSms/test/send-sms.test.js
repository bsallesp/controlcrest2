'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const sendSmsFunction = require('../SendSms/index.js');
const { handleRequest, sendTelnyxSms } = sendSmsFunction._internals;

function createContext() {
  return {
    log: {
      error() {}
    },
    res: null
  };
}

test('returns 500 when Telnyx configuration is missing', async () => {
  const context = createContext();

  await handleRequest(
    context,
    { method: 'POST', headers: {}, body: { to: '+15551234567', text: 'hello' } },
    { env: {} }
  );

  assert.equal(context.res.status, 500);
  assert.deepEqual(JSON.parse(context.res.body), {
    ok: false,
    error: 'Server configuration error'
  });
});

test('returns 400 when request payload is invalid', async () => {
  const context = createContext();

  await handleRequest(
    context,
    { method: 'POST', headers: {}, body: { to: '', text: '' } },
    { env: { TELNYX_API_KEY: 'key', TELNYX_FROM_NUMBER: '+15550001111' } }
  );

  assert.equal(context.res.status, 400);
  assert.deepEqual(JSON.parse(context.res.body), {
    ok: false,
    error: 'Fields "to" and "text" are required'
  });
});

test('sends SMS through Telnyx with expected payload', async () => {
  let capturedRequest;
  const context = createContext();

  await handleRequest(
    context,
    { method: 'POST', headers: { origin: 'http://localhost:4200' }, body: { to: '+15551234567', text: 'Lead received' } },
    {
      env: {
        TELNYX_API_KEY: 'test-key',
        TELNYX_FROM_NUMBER: '+15550001111',
        ALLOWED_ORIGIN: 'http://localhost:4200'
      },
      fetchImpl: async (url, options) => {
        capturedRequest = { url, options };
        return {
          ok: true,
          json: async () => ({ data: { id: 'msg_123' } })
        };
      }
    }
  );

  assert.equal(context.res.status, 200);
  assert.deepEqual(JSON.parse(context.res.body), {
    ok: true,
    provider: 'telnyx',
    messageId: 'msg_123'
  });
  assert.equal(capturedRequest.url, 'https://api.telnyx.com/v2/messages');
  assert.equal(capturedRequest.options.method, 'POST');
  assert.equal(capturedRequest.options.headers.Authorization, 'Bearer test-key');
  assert.deepEqual(JSON.parse(capturedRequest.options.body), {
    from: '+15550001111',
    to: '+15551234567',
    text: 'Lead received'
  });
});

test('surfaces Telnyx failures as 502', async () => {
  const context = createContext();

  await handleRequest(
    context,
    { method: 'POST', headers: {}, body: { to: '+15551234567', text: 'Lead received' } },
    {
      env: {
        TELNYX_API_KEY: 'test-key',
        TELNYX_FROM_NUMBER: '+15550001111'
      },
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        text: async () => 'unauthorized'
      })
    }
  );

  assert.equal(context.res.status, 502);
  assert.deepEqual(JSON.parse(context.res.body), {
    ok: false,
    error: 'Could not send SMS. Try again later.'
  });
});

test('sendTelnyxSms returns the Telnyx message id', async () => {
  const result = await sendTelnyxSms(
    { to: '+15551234567', text: 'Hello' },
    {
      env: {
        TELNYX_API_KEY: 'test-key',
        TELNYX_FROM_NUMBER: '+15550001111'
      },
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ data: { id: 'msg_456' } })
      })
    }
  );

  assert.deepEqual(result, { id: 'msg_456' });
});