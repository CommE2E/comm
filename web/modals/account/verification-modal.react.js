// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  type ServerVerificationResult,
  verifyField,
} from 'lib/types/verify-types';

import { useSelector } from '../../redux/redux-utils';
import css from '../../style.css';
import Modal from '../modal.react';

type BaseProps = {|
  +onClose: () => void,
|};
type Props = {|
  ...BaseProps,
  +serverVerificationResult: ?ServerVerificationResult,
|};
function VerificationModal(props: Props) {
  const { onClose, serverVerificationResult } = props;
  invariant(
    serverVerificationResult,
    'VerificationModal needs a serverVerificationResult',
  );

  const { success } = serverVerificationResult;
  let message, title;
  if (!success) {
    title = 'Invalid code';
    message = 'Sorry, but that code has expired or is invalid.';
  } else if (success && serverVerificationResult.field === verifyField.EMAIL) {
    title = 'Verified email';
    message = 'Thanks for verifying your email address!';
  }
  invariant(
    title && message,
    "VerificationModal can't handle serverVerificationResult " +
      JSON.stringify(serverVerificationResult),
  );

  return (
    <Modal name={title} onClose={onClose}>
      <div className={css['modal-body']}>
        <p>{message}</p>
      </div>
    </Modal>
  );
}

export default React.memo<BaseProps>(function ConnectedVerificationModal(
  props: BaseProps,
) {
  const serverVerificationResult = useSelector(
    (state) => state.serverVerificationResult,
  );

  return (
    <VerificationModal
      {...props}
      serverVerificationResult={serverVerificationResult}
    />
  );
});
