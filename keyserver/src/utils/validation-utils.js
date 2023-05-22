// @flow

import type { TType } from 'tcomb';

import type { PolicyType } from 'lib/facts/policies.js';
import {
  hasMinCodeVersion,
  FUTURE_CODE_VERSION,
} from 'lib/shared/version-utils.js';
import { type PlatformDetails, isWebPlatform } from 'lib/types/device-types.js';
import { ServerError } from 'lib/utils/errors.js';
import {
  tCookie,
  tPassword,
  tPlatform,
  tPlatformDetails,
  assertWithValidator,
  convertToNewIDSchema,
  keyserverPrefixID,
  convertClientIDsToServerIDs,
  convertObject,
  convertServerIDsToClientIDs,
} from 'lib/utils/validation-utils.js';

import { fetchNotAcknowledgedPolicies } from '../fetchers/policy-acknowledgment-fetchers.js';
import { verifyClientSupported } from '../session/version.js';
import type { Viewer } from '../session/viewer.js';

async function validateInput<T>(
  viewer: Viewer,
  inputValidator: TType<T>,
  input: mixed,
): Promise<T> {
  if (!viewer.isSocket) {
    await checkClientSupported(viewer, inputValidator, input);
  }
  const convertedInput = checkInputValidator(inputValidator, input);

  if (
    hasMinCodeVersion(viewer.platformDetails, FUTURE_CODE_VERSION) &&
    !isWebPlatform(viewer.platformDetails?.platform) &&
    convertToNewIDSchema
  ) {
    try {
      return convertClientIDsToServerIDs(
        keyserverPrefixID,
        inputValidator,
        convertedInput,
      );
    } catch (err) {
      throw new ServerError(err.message);
    }
  }

  return convertedInput;
}

function validateOutput<T>(
  platformDetails: ?PlatformDetails,
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
    hasMinCodeVersion(platformDetails, FUTURE_CODE_VERSION) &&
    !isWebPlatform(platformDetails?.platform) &&
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

function checkInputValidator<T>(inputValidator: TType<T>, input: mixed): T {
  if (inputValidator.is(input)) {
    return assertWithValidator(input, inputValidator);
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
  policiesValidator,
};
