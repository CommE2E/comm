// @flow

import invariant from 'invariant';
import PropTypes from 'prop-types';

export const verifyField = Object.freeze({
  EMAIL: 0,
  RESET_PASSWORD: 1,
});
export type VerifyField = $Values<typeof verifyField>;
export function assertVerifyField(
  ourVerifyField: number,
): VerifyField {
  invariant(
    ourVerifyField === 0 || ourVerifyField === 1,
    "number is not VerifyField enum",
  );
  return ourVerifyField;
}

export type CodeVerificationRequest = {|
  code: string,
|};

export type HandleVerificationCodeResult = {|
  verifyField: VerifyField,
  resetPasswordUsername?: string,
|};

type FailedVerificationResult = {|
  success: false,
|};
type EmailServerVerificationResult = {|
  success: true,
  field: 0,
|};
type ResetPasswordServerVerificationResult = {|
  success: true,
  field: 1,
  username: string,
|};
export type ServerSuccessfulVerificationResult =
  | EmailServerVerificationResult
  | ResetPasswordServerVerificationResult;
export type ServerVerificationResult =
  | FailedVerificationResult
  | ServerSuccessfulVerificationResult;

export const serverVerificationResultPropType = PropTypes.oneOfType([
  PropTypes.shape({
    success: PropTypes.oneOf([ false ]).isRequired,
  }),
  PropTypes.shape({
    success: PropTypes.oneOf([ true ]).isRequired,
    field: PropTypes.oneOf([ verifyField.EMAIL ]).isRequired,
  }),
  PropTypes.shape({
    success: PropTypes.oneOf([ true ]).isRequired,
    field: PropTypes.oneOf([ verifyField.RESET_PASSWORD ]).isRequired,
    username: PropTypes.string.isRequired,
  }),
]);
