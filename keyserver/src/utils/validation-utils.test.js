// @flow

import t from 'tcomb';

import { tPassword, tShape } from 'lib/utils/validation-utils.js';

import { sanitizeInput, redactedString } from './validation-utils.js';

describe('sanitization', () => {
  it('should redact a string', () => {
    expect(sanitizeInput(tPassword, 'password')).toStrictEqual(redactedString);
  });

  it('should redact a string inside an object', () => {
    const validator = tShape({ password: tPassword });
    const object = { password: 'password' };
    const redacted = { password: redactedString };
    expect(sanitizeInput(validator, object)).toStrictEqual(redacted);
  });

  it('should redact an optional string', () => {
    const validator = tShape({ password: t.maybe(tPassword) });
    const object = { password: 'password' };
    const redacted = { password: redactedString };
    expect(sanitizeInput(validator, object)).toStrictEqual(redacted);
  });

  it('should redact a string in optional object', () => {
    const validator = tShape({ obj: t.maybe(tShape({ password: tPassword })) });
    const object = { obj: { password: 'password' } };
    const redacted = { obj: { password: redactedString } };
    expect(sanitizeInput(validator, object)).toStrictEqual(redacted);
  });

  it('should redact a string array', () => {
    const validator = tShape({ passwords: t.list(tPassword) });
    const object = { passwords: ['password', 'password'] };
    const redacted = { passwords: [redactedString, redactedString] };
    expect(sanitizeInput(validator, object)).toStrictEqual(redacted);
  });

  it('should redact a string inside a dict', () => {
    const validator = tShape({ passwords: t.dict(t.String, tPassword) });
    const object = { passwords: { a: 'password', b: 'password' } };
    const redacted = { passwords: { a: redactedString, b: redactedString } };
    expect(sanitizeInput(validator, object)).toStrictEqual(redacted);
  });

  it('should redact password dict key', () => {
    const validator = tShape({ passwords: t.dict(tPassword, t.Bool) });
    const object = { passwords: { password1: true, password2: false } };
    const redacted = { passwords: {} };
    redacted.passwords[redactedString] = false;
    expect(sanitizeInput(validator, object)).toStrictEqual(redacted);
  });

  it('should redact a string inside a union', () => {
    const validator = tShape({
      password: t.union([tPassword, t.String, t.Bool]),
    });
    const object = { password: 'password' };
    const redacted = { password: redactedString };
    expect(sanitizeInput(validator, object)).toStrictEqual(redacted);
  });

  it('should redact a string inside an object array', () => {
    const validator = tShape({
      passwords: t.list(tShape({ password: tPassword })),
    });
    const object = { passwords: [{ password: 'password' }] };
    const redacted = { passwords: [{ password: redactedString }] };
    expect(sanitizeInput(validator, object)).toStrictEqual(redacted);
  });
});
