// @flow

import t, { type TUnion } from 'tcomb';

import type { GetSessionPublicKeysArgs } from 'lib/types/request-types.js';
import {
  type SessionPublicKeys,
  sessionPublicKeysValidator,
} from 'lib/types/session-types.js';
import { tShape, tNull } from 'lib/utils/validation-utils.js';

import { fetchSessionPublicKeys } from '../fetchers/key-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import { validateInput } from '../utils/validation-utils.js';

const getSessionPublicKeysInputValidator = tShape({
  session: t.String,
});

type GetSessionPublicKeysResponse = SessionPublicKeys | null;
export const getSessionPublicKeysResponseValidator: TUnion<GetSessionPublicKeysResponse> =
  t.union([sessionPublicKeysValidator, tNull]);

async function getSessionPublicKeysResponder(
  viewer: Viewer,
  input: any,
): Promise<GetSessionPublicKeysResponse> {
  if (!viewer.loggedIn) {
    return null;
  }
  const request: GetSessionPublicKeysArgs = input;
  await validateInput(viewer, getSessionPublicKeysInputValidator, request);
  return await fetchSessionPublicKeys(request.session);
}

export { getSessionPublicKeysResponder };
