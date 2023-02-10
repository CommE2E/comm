// @flow

import t from 'tcomb';

import type { HandleVerificationCodeResult } from 'lib/types/verify-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { tShape } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';
import { validateInput } from '../utils/validation-utils.js';

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
