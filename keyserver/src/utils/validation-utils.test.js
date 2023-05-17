// @flow

import t from 'tcomb';

import {
  tPassword,
  tShape,
  tID,
  convertServerIDsToClientIDs,
  convertClientIDsToServerIDs,
} from 'lib/utils/validation-utils.js';

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

describe('id conversion', () => {
  it('should convert string id', () => {
    const validator = tShape({ id: tID });
    const serverData = { id: '1' };
    const clientData = { id: '0|1' };

    expect(
      convertServerIDsToClientIDs('0', validator, serverData),
    ).toStrictEqual(clientData);
    expect(
      convertClientIDsToServerIDs('0', validator, clientData),
    ).toStrictEqual(serverData);
  });

  it('should convert a complex type', () => {
    const validator = tShape({ ids: t.dict(tID, t.list(tID)) });
    const serverData = { ids: { '1': ['11', '12'], '2': [], '3': ['13'] } };
    const clientData = {
      ids: { '0|1': ['0|11', '0|12'], '0|2': [], '0|3': ['0|13'] },
    };

    expect(
      convertServerIDsToClientIDs('0', validator, serverData),
    ).toStrictEqual(clientData);
    expect(
      convertClientIDsToServerIDs('0', validator, clientData),
    ).toStrictEqual(serverData);
  });

  it('should convert a refinement', () => {
    const validator = t.refinement(tID, () => true);
    const serverData = '1';
    const clientData = '0|1';

    expect(
      convertServerIDsToClientIDs('0', validator, serverData),
    ).toStrictEqual(clientData);
    expect(
      convertClientIDsToServerIDs('0', validator, clientData),
    ).toStrictEqual(serverData);
  });
});
