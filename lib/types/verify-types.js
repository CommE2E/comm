// @flow

export const verifyField = Object.freeze({
  EMAIL: 0,
  RESET_PASSWORD: 1,
});
export type VerifyField = $Values<typeof verifyField>;

export type HandleVerificationCodeResult = {|
  +verifyField: VerifyField,
  +resetPasswordUsername?: string,
|};
