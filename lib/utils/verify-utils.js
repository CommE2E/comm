// @flow

import invariant from 'invariant';

export type VerifyField = 0 | 1;
export const verifyField: {[name: string]: VerifyField} = {
  EMAIL: 0,
  RESET_PASSWORD: 1,
};
export function assertVerifyField(
  ourVerifyField: number,
): VerifyField {
  invariant(
    ourVerifyField === 0 ||
      ourVerifyField === 1,
    "number is not verifyField enum",
  );
  return ourVerifyField;
}
