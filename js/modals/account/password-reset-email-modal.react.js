// @flow

import React from 'react';

import Modal from '../modal.react';

type Props = {
  onClose: () => void,
};

export default function PasswordResetEmailModal(props: Props) {
  return (
    <Modal name="Password reset email sent" onClose={props.onClose}>
      <div className="modal-body">
        <p>
          {"We've sent you an email with instructions on how to reset "}
          {"your password. Note that the email will expire in a day."}
        </p>
      </div>
    </Modal>
  );
}
