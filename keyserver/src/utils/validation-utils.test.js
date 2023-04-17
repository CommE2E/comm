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
});
