// @flow

import invariant from 'invariant';

export const verifyField = Object.freeze({
  EMAIL: 0,
  RESET_PASSWORD: 1,
});
export type VerifyField = $Values<typeof verifyField>;
export function assertVerifyField(ourVerifyField: number): VerifyField {
  invariant(
    ourVerifyField === 0 || ourVerifyField === 1,
    'number is not VerifyField enum',
  );
  return ourVerifyField;
}

export type CodeVerificationRequest = {|
  +code: string,
|};

export type HandleVerificationCodeResult = {|
  +verifyField: VerifyField,
  +resetPasswordUsername?: string,
|};

type EmailServerVerificationResult = {|
  +success: true,
  +field: 0,
|};
type ResetPasswordServerVerificationResult = {|
  +success: true,
  +field: 1,
  +username: string,
|};
export type ServerSuccessfulVerificationResult =
  | EmailServerVerificationResult
  | ResetPasswordServerVerificationResult;
