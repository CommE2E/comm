// @flow

import _mapKeys from 'lodash/fp/mapKeys.js';
import _mapValues from 'lodash/fp/mapValues.js';
import type { TType } from 'tcomb';

import type { PolicyType } from 'lib/facts/policies.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import { ServerError } from 'lib/utils/errors.js';
import {
  tCookie,
  tPassword,
  tPlatform,
  tPlatformDetails,
  assertWithValidator,
} from 'lib/utils/validation-utils.js';

import { fetchNotAcknowledgedPolicies } from '../fetchers/policy-acknowledgment-fetchers.js';
import { verifyClientSupported } from '../session/version.js';
import type { Viewer } from '../session/viewer.js';

async function validateInput<T>(
  viewer: Viewer,
  inputValidator: ?TType<T>,
  input: T,
) {
  if (!viewer.isSocket) {
    await checkClientSupported(viewer, inputValidator, input);
  }
  checkInputValidator(inputValidator, input);
}

function checkInputValidator<T>(inputValidator: ?TType<T>, input: T) {
  if (!inputValidator || inputValidator.is(input)) {
    return;
  }
  const error = new ServerError('invalid_parameters');
  error.sanitizedInput = input ? sanitizeInput(inputValidator, input) : null;
  throw error;
}

async function checkClientSupported<T>(
  viewer: Viewer,
  inputValidator: ?TType<T>,
  input: T,
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
function sanitizeInput<T>(inputValidator: TType<T>, input: T): T {
  return convertObject(
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

function convertObject<T, I: any>(
  validator: TType<I>,
  input: I,
  typesToConvert: $ReadOnlyArray<TType<T>>,
  conversionFunction: T => T,
): I {
  if (input === null || input === undefined) {
    return input;
  }

  const TValidator = typesToConvert[typesToConvert.indexOf(validator)];
  if (TValidator && TValidator.is(input)) {
    const TInput = assertWithValidator(input, TValidator);
    const converted = conversionFunction(TInput);
    return assertWithValidator(converted, validator);
  }

  if (validator.meta.kind === 'maybe') {
    return convertObject(
      validator.meta.type,
      input,
      typesToConvert,
      conversionFunction,
    );
  }
  if (validator.meta.kind === 'interface' && typeof input === 'object') {
    const result = {};
    for (const key in input) {
      const innerValidator = validator.meta.props[key];
      result[key] = convertObject(
        innerValidator,
        input[key],
        typesToConvert,
        conversionFunction,
      );
    }
    return assertWithValidator(result, validator);
  }
  if (validator.meta.kind === 'union') {
    for (const innerValidator of validator.meta.types) {
      if (innerValidator.is(input)) {
        return convertObject(
          innerValidator,
          input,
          typesToConvert,
          conversionFunction,
        );
      }
    }
    return input;
  }
  if (validator.meta.kind === 'list' && Array.isArray(input)) {
    const innerValidator = validator.meta.type;
    return input.map(value =>
      convertObject(innerValidator, value, typesToConvert, conversionFunction),
    );
  }
  if (validator.meta.kind === 'dict' && typeof input === 'object') {
    const domainValidator = validator.meta.domain;
    const codomainValidator = validator.meta.codomain;
    if (typesToConvert.includes(domainValidator)) {
      input = _mapKeys(key => conversionFunction(key))(input);
    }
    return _mapValues(value =>
      convertObject(
        codomainValidator,
        value,
        typesToConvert,
        conversionFunction,
      ),
    )(input);
  }

  return input;
}

async function policiesValidator(
  viewer: Viewer,
  policies: $ReadOnlyArray<PolicyType>,
) {
  if (!policies.length) {
    return;
  }
  if (!hasMinCodeVersion(viewer.platformDetails, 181)) {
    return;
  }

  const notAcknowledgedPolicies = await fetchNotAcknowledgedPolicies(
    viewer.id,
    policies,
  );

  if (notAcknowledgedPolicies.length) {
    throw new ServerError('policies_not_accepted', {
      notAcknowledgedPolicies,
    });
  }
}

export {
  validateInput,
  checkInputValidator,
  redactedString,
  sanitizeInput,
  findFirstInputMatchingValidator,
  checkClientSupported,
  convertObject,
  policiesValidator,
};
