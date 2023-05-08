// @flow

import _mapKeys from 'lodash/fp/mapKeys.js';
import _mapValues from 'lodash/fp/mapValues.js';
import type { TType, TInterface } from 'tcomb';

import type { PolicyType } from 'lib/facts/policies.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import { isWebPlatform } from 'lib/types/device-types.js';
import { ServerError } from 'lib/utils/errors.js';
import {
  tCookie,
  tPassword,
  tPlatform,
  tPlatformDetails,
  assertWithValidator,
  tID,
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

const convertToNewIDSchema = false;
const keyserverPrefixID = '256';

function validateOutput<T>(
  viewer: Viewer,
  outputValidator: TType<T>,
  data: T,
): T {
  if (!outputValidator.is(data)) {
    console.trace(
      'Output validation failed, validator is:',
      outputValidator.displayName,
    );
    return data;
  }

  if (
    hasMinCodeVersion(viewer.platformDetails, 1000) &&
    !isWebPlatform(viewer.platformDetails?.platform) &&
    convertToNewIDSchema
  ) {
    return convertServerIDsToClientIDs(
      keyserverPrefixID,
      outputValidator,
      data,
    );
  }

  return data;
}

function convertServerIDsToClientIDs<T>(
  serverPrefixID: string,
  outputValidator: TType<T>,
  data: T,
): T {
  const conversionFunction = id => {
    if (id.indexOf('|') !== -1) {
      console.warn(`Server id '${id}' already has a prefix`);
      return id;
    }
    return `${serverPrefixID}|${id}`;
  };

  return convertObject(outputValidator, data, [tID], conversionFunction);
}

function convertClientIDsToServerIDs<T>(
  serverPrefixID: string,
  outputValidator: TType<T>,
  data: T,
): T {
  const prefix = serverPrefixID + '|';
  const conversionFunction = id => {
    if (id.startsWith(prefix)) {
      return id.substr(prefix.length);
    }

    throw new ServerError('invalid_client_id_prefix');
  };

  return convertObject(outputValidator, data, [tID], conversionFunction);
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

function convertObject<T, I>(
  validator: TType<I>,
  input: I,
  typesToConvert: $ReadOnlyArray<TType<T>>,
  conversionFunction: T => T,
): I {
  if (input === null || input === undefined) {
    return input;
  }

  // While they should be the same runtime object,
  // `TValidator` is `TType<T>` and `validator` is `TType<I>`.
  // Having them have different types allows us to use `assertWithValidator`
  // to change `input` flow type
  const TValidator = typesToConvert[typesToConvert.indexOf(validator)];
  if (TValidator && TValidator.is(input)) {
    const TInput = assertWithValidator(input, TValidator);
    const converted = conversionFunction(TInput);
    return assertWithValidator(converted, validator);
  }

  if (validator.meta.kind === 'maybe' || validator.meta.kind === 'subtype') {
    return convertObject(
      validator.meta.type,
      input,
      typesToConvert,
      conversionFunction,
    );
  }
  if (validator.meta.kind === 'interface' && typeof input === 'object') {
    const recastValidator: TInterface<typeof input> = (validator: any);
    const result = {};
    for (const key in input) {
      const innerValidator = recastValidator.meta.props[key];
      result[key] = convertObject(
        innerValidator,
        input[key],
        typesToConvert,
        conversionFunction,
      );
    }
    return assertWithValidator(result, recastValidator);
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
    return (input.map(value =>
      convertObject(innerValidator, value, typesToConvert, conversionFunction),
    ): any);
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
  validateOutput,
  checkInputValidator,
  redactedString,
  sanitizeInput,
  findFirstInputMatchingValidator,
  checkClientSupported,
  convertServerIDsToClientIDs,
  convertClientIDsToServerIDs,
  convertObject,
  policiesValidator,
};
