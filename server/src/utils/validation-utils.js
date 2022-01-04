// @flow

import invariant from 'invariant';
import _mapKeys from 'lodash/fp/mapKeys';
import _mapValues from 'lodash/fp/mapValues';
import type { TInterface, TUnion, TList, TDict } from 'tcomb';

import { ServerError } from 'lib/utils/errors';
import {
  tCookie,
  tPassword,
  tPlatform,
  tPlatformDetails,
  tID,
} from 'lib/utils/validation-utils';

import { verifyClientSupported } from '../session/version';
import type { Viewer } from '../session/viewer';

const USE_EXTENDED_CLIENT_ID_SCHEMA = false;

async function validateInput(viewer: Viewer, inputValidator: *, input: *) {
  if (!viewer.isSocket) {
    await checkClientSupported(viewer, inputValidator, input);
  }
  checkInputValidator(inputValidator, input);
}

function checkInputValidator(inputValidator: *, input: *) {
  if (!inputValidator || inputValidator.is(input)) {
    return;
  }
  const error = new ServerError('invalid_parameters');
  error.sanitizedInput = input ? sanitizeInput(inputValidator, input) : null;
  throw error;
}

function validateAndConvertOutput(
  viewer: Viewer,
  outputValidator: *,
  data: *,
): any {
  if (!outputValidator || outputValidator.is(data)) {
    if (
      viewer.platformDetails?.platform !== 'web' &&
      viewer.platformDetails?.codeVersion &&
      Number(viewer.platformDetails?.codeVersion) >= 128 &&
      USE_EXTENDED_CLIENT_ID_SCHEMA
    ) {
      return convertIDSchema(outputValidator, data, true);
    } else {
      return data;
    }
  }

  invariant(false, `Server output data validation failed`);
}

async function checkClientSupported(
  viewer: Viewer,
  inputValidator: *,
  input: *,
) {
  let platformDetails;
  if (inputValidator) {
    platformDetails = findFirstInputMatchingValidator(
      inputValidator,
      tPlatformDetails,
      input,
    );
  }
  if (!platformDetails && inputValidator) {
    const platform = findFirstInputMatchingValidator(
      inputValidator,
      tPlatform,
      input,
    );
    if (platform) {
      platformDetails = { platform };
    }
  }
  if (!platformDetails) {
    ({ platformDetails } = viewer);
  }
  await verifyClientSupported(viewer, platformDetails);
}

const redactedString = '********';
const redactedTypes = [tPassword, tCookie];
function sanitizeInput(inputValidator: *, input: *) {
  if (!inputValidator) {
    return input;
  }
  if (redactedTypes.includes(inputValidator) && typeof input === 'string') {
    return redactedString;
  }
  if (
    inputValidator.meta.kind === 'maybe' &&
    redactedTypes.includes(inputValidator.meta.type) &&
    typeof input === 'string'
  ) {
    return redactedString;
  }
  if (
    inputValidator.meta.kind !== 'interface' ||
    typeof input !== 'object' ||
    !input
  ) {
    return input;
  }
  const result = {};
  for (const key in input) {
    const value = input[key];
    const validator = inputValidator.meta.props[key];
    result[key] = sanitizeInput(validator, value);
  }
  return result;
}

function findFirstInputMatchingValidator(
  wholeInputValidator: *,
  inputValidatorToMatch: *,
  input: *,
): any {
  if (!wholeInputValidator || input === null || input === undefined) {
    return null;
  }
  if (
    wholeInputValidator === inputValidatorToMatch &&
    wholeInputValidator.is(input)
  ) {
    return input;
  }
  if (wholeInputValidator.meta.kind === 'maybe') {
    return findFirstInputMatchingValidator(
      wholeInputValidator.meta.type,
      inputValidatorToMatch,
      input,
    );
  }
  if (
    wholeInputValidator.meta.kind === 'interface' &&
    typeof input === 'object'
  ) {
    for (const key in input) {
      const value = input[key];
      const validator = wholeInputValidator.meta.props[key];
      const innerResult = findFirstInputMatchingValidator(
        validator,
        inputValidatorToMatch,
        value,
      );
      if (innerResult) {
        return innerResult;
      }
    }
  }
  if (wholeInputValidator.meta.kind === 'union') {
    for (const validator of wholeInputValidator.meta.types) {
      if (validator.is(input)) {
        return findFirstInputMatchingValidator(
          validator,
          inputValidatorToMatch,
          input,
        );
      }
    }
  }
  if (wholeInputValidator.meta.kind === 'list' && Array.isArray(input)) {
    const validator = wholeInputValidator.meta.type;
    for (const value of input) {
      const innerResult = findFirstInputMatchingValidator(
        validator,
        inputValidatorToMatch,
        value,
      );
      if (innerResult) {
        return innerResult;
      }
    }
  }
  return null;
}

function convertID<S: ?string>(ID: S, toExtended: boolean): S {
  if (!ID) {
    return ID;
  }
  if (toExtended) {
    if (ID.indexOf('|') !== -1) {
      console.log('Double conversion - threadID already has prefix');
      return ID;
    }
    return '00001|' + ID;
  } else {
    if (ID.indexOf('|') === -1) {
      return ID;
    }
    return ID.split('|')[1];
  }
}

function convertIDSchema<T>(
  inputValidator: *,
  input: $ReadOnly<T>,
  toExtended: boolean,
): T {
  if (!inputValidator) {
    return input;
  }
  if (
    inputValidator === tID ||
    (inputValidator.meta.kind === 'maybe' && inputValidator.meta.type === tID)
  ) {
    if (typeof input === 'string') {
      return convertID(input, toExtended);
    } else {
      return input;
    }
  }
  if (typeof input !== 'object' || !input) {
    return input;
  }
  if (inputValidator.meta.kind === 'list') {
    const validator: TList<*> = inputValidator;
    if (!Array.isArray(input)) {
      return input;
    }
    return input.map(el =>
      convertIDSchema(validator.meta.type, el, toExtended),
    );
  } else if (inputValidator.meta.kind === 'union') {
    const validator: TUnion<*> = inputValidator;
    for (const subvalidator: TInterface of validator.meta.types) {
      if (subvalidator.is(input)) {
        return convertIDSchema(subvalidator, input, toExtended);
      }
    }
  } else if (inputValidator.meta.kind === 'dict') {
    const validator: TDict<*> = inputValidator;
    let inputObject = input;
    if (validator.meta.domain.meta.kind === tID) {
      inputObject = _mapKeys(id => convertID(id, toExtended))(input);
    }
    return _mapValues(v =>
      convertIDSchema(validator.meta.codomain, v, toExtended),
    )(inputObject);
  } else if (inputValidator.meta.kind === 'interface') {
    const validator: TInterface = inputValidator;
    const result: any = {};
    for (const key in input) {
      const value = input[key];
      const subvalidator = validator.meta.props[key];
      result[key] = convertIDSchema(subvalidator, value, toExtended);
    }
    return result;
  }
  return input;
}

export {
  validateInput,
  validateAndConvertOutput,
  checkInputValidator,
  checkClientSupported,
  convertIDSchema,
};
