// @flow

import React from 'react';

import css from '../../style.css';
import Modal from '../modal.react';

type Props = {
  onClose: () => void,
};

export default function VerificationSuccessModal(props: Props) {
  return (
    <Modal name="Verified email" onClose={props.onClose}>
      <div className={css['modal-body']}>
        <p>
          Thanks for verifying your email address!
        </p>
      </div>
    </Modal>
  );
}
