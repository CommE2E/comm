// @flow

import t from 'tcomb';

import type { GetSessionPublicKeysArgs } from 'lib/types/request-types.js';
import type { SessionPublicKeys } from 'lib/types/session-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import { fetchSessionPublicKeys } from '../fetchers/key-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import { validateInput } from '../utils/validation-utils.js';

const getSessionPublicKeysInputValidator = tShape({
  session: t.String,
});

async function getSessionPublicKeysResponder(
  viewer: Viewer,
  input: any,
): Promise<SessionPublicKeys | null> {
  if (!viewer.loggedIn) {
    return null;
  }
  const request: GetSessionPublicKeysArgs = input;
  await validateInput(viewer, getSessionPublicKeysInputValidator, request);
  return await fetchSessionPublicKeys(request.session);
}

export { getSessionPublicKeysResponder };
