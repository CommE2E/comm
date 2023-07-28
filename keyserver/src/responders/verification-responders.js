// @flow

import t from 'tcomb';
import type { TInterface } from 'tcomb';

import type { HandleVerificationCodeResult } from 'lib/types/verify-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { tShape } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';

export type CodeVerificationRequest = { code: string };

export const codeVerificationRequestInputValidator: TInterface<CodeVerificationRequest> =
  tShape<CodeVerificationRequest>({
    code: t.String,
  });

/* eslint-disable no-unused-vars */
async function codeVerificationResponder(
  viewer: Viewer,
  request: CodeVerificationRequest,
): Promise<HandleVerificationCodeResult> {
  // We have no way to handle this request anymore
  throw new ServerError('deprecated');
}

export { codeVerificationResponder };
