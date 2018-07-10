// @flow

import t from 'tcomb';

import { ServerError } from 'lib/utils/errors';

function validateInput(inputValidator: *, input: *) {
  if (inputValidator.is(input)) {
    return;
  }
  const sanitizedInput = sanitizeInput(inputValidator, input);
  throw new ServerError('invalid_parameters', { input: sanitizedInput });
}

const fakePassword = "********";
function sanitizeInput(inputValidator: *, input: *) {
  if (!inputValidator) {
    return input;
  }
  if (inputValidator === tPassword && typeof input === "string") {
    return fakePassword;
  }
  if (
    inputValidator.meta.kind === "maybe" &&
    inputValidator.meta.type === tPassword &&
    typeof input === "string"
  ) {
    return fakePassword;
  }
  if (
    inputValidator.meta.kind !== "interface" ||
    typeof input !== "object" ||
    !input
  ) {
    return input;
  }
  const result = {};
  for (let key in input) {
    const value = input[key];
    const validator = inputValidator.meta.props[key];
    result[key] = sanitizeInput(validator, value);
  }
  return result;
}

function tBool(value: bool) {
  return t.irreducible('literal bool', x => x === value);
}

function tString(value: string) {
  return t.irreducible('literal string', x => x === value);
}

function tShape(spec: {[key: string]: *}) {
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
const tPlatform = t.enums.of(['ios', 'android', 'web']);
const tDeviceType = t.enums.of(['ios', 'android']);
const tPlatformDetails = tShape({
  platform: tPlatform,
  codeVersion: t.maybe(t.Number),
  stateVersion: t.maybe(t.Number),
});
const tPassword = t.refinement(t.String, (password: string) => password);

export {
  validateInput,
  tBool,
  tString,
  tShape,
  tRegex,
  tNumEnum,
  tDate,
  tColor,
  tPlatform,
  tDeviceType,
  tPlatformDetails,
  tPassword,
};
