// @flow

import _mapKeys from 'lodash/fp/mapKeys';
import _mapValues from 'lodash/fp/mapValues';
import type { TInterface, TUnion, TList, TDict } from 'tcomb';

import { ServerError } from 'lib/utils/errors';
import {
  tCookie,
  tPassword,
  tPlatform,
  tPlatformDetails,
} from 'lib/utils/validation-utils';

import { verifyClientSupported } from '../session/version';
import type { Viewer } from '../session/viewer';

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
function sanitizeInput(inputValidator: *, input: *): any {
  return convertInput(
    inputValidator,
    input,
    redactedTypes,
    () => redactedString,
  );
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

export type ConversionType = 'client_to_server' | 'server_to_client';

function convertIDSchema<S>(conversionType: ConversionType): (ID: S) => S {
  return (ID: *) => {
    if (!ID || typeof ID !== 'string') {
      return ID;
    }
    if (conversionType === 'server_to_client') {
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
  };
}

function convertInput<T>(
  inputValidator: *,
  input: T,
  typesToConvert: $ReadOnlyArray<*>,
  conversionFunc: (input: T) => T,
): T {
  if (!inputValidator) {
    return input;
  }
  if (typesToConvert.includes(inputValidator)) {
    return conversionFunc(input);
  }

  if (inputValidator.meta.kind === 'maybe') {
    if (input) {
      return convertInput(
        inputValidator.meta.type,
        input,
        typesToConvert,
        conversionFunc,
      );
    } else {
      return input;
    }
  }

  if (inputValidator.meta.kind === 'union') {
    const validator: TUnion<*> = inputValidator;
    for (const subvalidator: TInterface of validator.meta.types) {
      if (subvalidator.is(input)) {
        return convertInput(
          subvalidator,
          input,
          typesToConvert,
          conversionFunc,
        );
      }
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
      convertInput(validator.meta.type, el, typesToConvert, conversionFunc),
    );
  } else if (inputValidator.meta.kind === 'dict') {
    const validator: TDict<*> = inputValidator;
    let inputObject = input;
    if (typesToConvert.includes(validator.meta.domain.meta.kind)) {
      inputObject = _mapKeys(id => conversionFunc(id))(input);
    }
    return _mapValues(v =>
      convertInput(validator.meta.codomain, v, typesToConvert, conversionFunc),
    )(inputObject);
  } else if (inputValidator.meta.kind === 'interface') {
    const validator: TInterface = inputValidator;
    const result: any = {};
    for (const key in input) {
      const value = input[key];
      const subvalidator = validator.meta.props[key];
      result[key] = convertInput(
        subvalidator,
        value,
        typesToConvert,
        conversionFunc,
      );
    }
    return result;
  }
  return input;
}

export {
  validateInput,
  checkInputValidator,
  checkClientSupported,
  convertIDSchema,
  convertInput,
};
