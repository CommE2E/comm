// @flow

import React from 'react';

import Modal from '../modal.react';

type Props = {
  onClose: () => void,
};

export default function VerifyEmailModal(props: Props) {
  return (
    <Modal name="Verify email" onClose={props.onClose}>
      <div className="modal-body">
        <p>
          We've sent you an email to verify your email address. Just click on
          the link in the email to complete the verification process.
        </p>
        <p>
          Note that the email will expire in a day, but another email can be
          sent from "Edit account" in the user menu at any time.
        </p>
      </div>
    </Modal>
  );
}
