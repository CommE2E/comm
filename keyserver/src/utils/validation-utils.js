// @flow

import type { TType } from 'tcomb';

import type { PolicyType } from 'lib/facts/policies.js';
import {
  hasMinCodeVersion,
  hasMinStateVersion,
} from 'lib/shared/version-utils.js';
import { type PlatformDetails } from 'lib/types/device-types.js';
import {
  convertClientIDsToServerIDs,
  convertObject,
  convertServerIDsToClientIDs,
} from 'lib/utils/conversion-utils.js';
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
import { thisKeyserverID } from '../user/identity.js';

async function validateInput<T>(
  viewer: Viewer,
  inputValidator: TType<T>,
  input: mixed,
  source: string,
): Promise<T> {
  if (!viewer.isSocket) {
    await checkClientSupported(viewer, inputValidator, input);
  }
  const convertedInput = checkInputValidator(inputValidator, input, source);

  const keyserverID = await thisKeyserverID();

  if (
    hasMinStateVersion(viewer.platformDetails, {
      native: 43,
      web: 3,
    })
  ) {
    try {
      return convertClientIDsToServerIDs(
        keyserverID,
        inputValidator,
        convertedInput,
      );
    } catch (err) {
      throw new ServerError(err.message);
    }
  }

  return convertedInput;
}

async function validateOutput<T>(
  platformDetails: ?PlatformDetails,
  outputValidator: TType<T>,
  data: T,
): Promise<T> {
  if (!outputValidator.is(data)) {
    console.trace(
      'Output validation failed, validator is:',
      outputValidator.displayName,
    );
    return data;
  }

  const keyserverID = await thisKeyserverID();

  if (
    hasMinStateVersion(platformDetails, {
      native: 43,
      web: 3,
    })
  ) {
    return convertServerIDsToClientIDs(keyserverID, outputValidator, data);
  }

  return data;
}

function checkInputValidator<T>(
  inputValidator: TType<T>,
  input: mixed,
  source: string,
): T {
  if (inputValidator.is(input)) {
    return assertWithValidator(input, inputValidator);
  }
  const error = new ServerError('invalid_parameters');
  try {
    error.sanitizedInput = input ? sanitizeInput(inputValidator, input) : null;
  } catch {
    error.sanitizedInput = null;
  }
  console.log(`failed input validation on ${source}`);
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
    { dontValidateInput: true },
  );
}

function findFirstInputMatchingValidator(
  wholeInputValidator: any,
  inputValidatorToMatch: any,
  input: any,
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
  if (!policies.length || !viewer.loggedIn) {
    return;
  }
  if (!hasMinCodeVersion(viewer.platformDetails, { native: 181 })) {
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
