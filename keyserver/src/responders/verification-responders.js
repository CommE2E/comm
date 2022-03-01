// @flow

import t from 'tcomb';

import type { HandleVerificationCodeResult } from 'lib/types/verify-types';
import { ServerError } from 'lib/utils/errors';
import { tShape } from 'lib/utils/validation-utils';

import type { Viewer } from '../session/viewer';
import { validateInput } from '../utils/validation-utils';

const codeVerificationRequestInputValidator = tShape({
  code: t.String,
});

/* eslint-disable no-unused-vars */
async function codeVerificationResponder(
  viewer: Viewer,
  input: any,
): Promise<HandleVerificationCodeResult> {
  /* eslint-enable no-unused-vars */
  await validateInput(viewer, codeVerificationRequestInputValidator, input);
  // We have no way to handle this request anymore
  throw new ServerError('deprecated');
}

export { codeVerificationResponder };
