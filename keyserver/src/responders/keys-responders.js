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
import { validateInput, validateOutput } from '../utils/validation-utils.js';

const getSessionPublicKeysInputValidator = tShape<GetSessionPublicKeysArgs>({
  session: t.String,
});

type GetSessionPublicKeysResponse = SessionPublicKeys | null;
export const getSessionPublicKeysResponseValidator: TUnion<GetSessionPublicKeysResponse> =
  t.union([sessionPublicKeysValidator, tNull]);

async function getSessionPublicKeysResponder(
  viewer: Viewer,
  input: mixed,
): Promise<GetSessionPublicKeysResponse> {
  if (!viewer.loggedIn) {
    return null;
  }
  const request = await validateInput(
    viewer,
    getSessionPublicKeysInputValidator,
    input,
  );
  const response = await fetchSessionPublicKeys(request.session);
  return validateOutput(
    viewer.platformDetails,
    getSessionPublicKeysResponseValidator,
    response,
  );
}

export { getSessionPublicKeysResponder };
