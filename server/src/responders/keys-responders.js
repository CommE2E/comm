// @flow

import t from 'tcomb';

import type { GetSessionPublicKeysArgs } from 'lib/types/request-types';
import type { SessionPublicKeys } from 'lib/types/session-types';
import { tShape } from 'lib/utils/validation-utils';

import { fetchSessionPublicKeys } from '../fetchers/key-fetchers';
import type { Viewer } from '../session/viewer';
import { validateInput } from '../utils/validation-utils';

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
