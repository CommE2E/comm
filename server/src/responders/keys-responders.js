// @flow

import t from 'tcomb';

import type { GetUserPublicKeysArgs } from 'lib/types/request-types';
import {
  type UserPublicKeys,
  userPublicKeysValidator,
} from 'lib/types/user-types';
import { tShape } from 'lib/utils/validation-utils';

import { fetchUserPublicKeys } from '../fetchers/key-fetchers';
import type { Viewer } from '../session/viewer';
import {
  validateInput,
  validateAndConvertOutput,
} from '../utils/validation-utils';

const getUserPublicKeysInputValidator = tShape({
  userID: t.String,
});

const getUserPublicKeysResponderResponseValidator = t.union([
  userPublicKeysValidator,
  t.Nil,
]);

async function getUserPublicKeysResponder(
  viewer: Viewer,
  input: any,
): Promise<UserPublicKeys | null> {
  if (!viewer.loggedIn) {
    return null;
  }
  const request: GetUserPublicKeysArgs = input;
  await validateInput(viewer, getUserPublicKeysInputValidator, request);
  const response = await fetchUserPublicKeys(viewer, request.userID);
  return validateAndConvertOutput(
    viewer,
    getUserPublicKeysResponderResponseValidator,
    response,
  );
}

export { getUserPublicKeysResponder };
