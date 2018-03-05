// @flow

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

function validateInput(inputValidator: *, input: *) {
  if (!inputValidator.is(input)) {
    throw new ServerError('invalid_parameters', { input });
  }
}

function tBool(value: bool) {
  return t.irreducible('true', x => x === value);
}

function tShape(spec: *) {
  return t.interface(spec, { strict: true });
}

function tRegex(regex: RegExp) {
  return t.refinement(t.String, val => regex.test(val));
}

function tNumEnum(assertFunc: (input: number) => *) {
  return t.refinement(
    t.Number,
    (input: number) => {
      try {
        assertFunc(input);
        return true;
      } catch (e) {
        return false;
      }
    },
  );
}

const tDate = tRegex(/^[0-9]{4}-[0-1][0-9]-[0-3][0-9]$/);
const tColor = tRegex(/^[a-fA-F0-9]{6}$/); // we don't include # char

export {
  validateInput,
  tBool,
  tShape,
  tRegex,
  tNumEnum,
  tDate,
  tColor,
};
