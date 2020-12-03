// @flow

import t from 'tcomb';

import type {
  CodeVerificationRequest,
  HandleVerificationCodeResult,
} from 'lib/types/verify-types';
import { verifyField } from 'lib/types/verify-types';
import { ServerError } from 'lib/utils/errors';

import { handleCodeVerificationRequest } from '../models/verification';
import type { Viewer } from '../session/viewer';
import { validateInput, tShape } from '../utils/validation-utils';

const codeVerificationRequestInputValidator = tShape({
  code: t.String,
});

async function codeVerificationResponder(
  viewer: Viewer,
  input: any,
): Promise<HandleVerificationCodeResult> {
  const request: CodeVerificationRequest = input;
  await validateInput(viewer, codeVerificationRequestInputValidator, request);

  const result = await handleCodeVerificationRequest(viewer, request.code);
  if (result.field === verifyField.EMAIL) {
    return { verifyField: result.field };
  } else if (result.field === verifyField.RESET_PASSWORD) {
    return {
      verifyField: result.field,
      resetPasswordUsername: result.username,
    };
  }
  throw new ServerError('invalid_code');
}

export { codeVerificationResponder };
