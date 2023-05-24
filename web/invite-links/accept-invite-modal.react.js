// @flow

import * as React from 'react';

import ModalOverlay from 'lib/components/modal-overlay.react.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { type InviteLinkVerificationResponse } from 'lib/types/link-types.js';

import css from './accept-invite-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';

type Props = {
  +verificationResponse: InviteLinkVerificationResponse,
};

function AcceptInviteModal(props: Props): React.Node {
  const { verificationResponse } = props;
  const { popModal } = useModalContext();

  React.useEffect(() => {
    if (verificationResponse.status === 'already_joined') {
      popModal();
    }
  }, [popModal, verificationResponse.status]);

  let content;
  if (verificationResponse.status === 'valid') {
    const { community } = verificationResponse;
    content = (
      <>
        <div className={css.text}>You have been invited to join</div>
        <div className={css.heading}>{community.name}</div>
        <hr />
        <div className={css.group}>
          <Button variant="filled" buttonColor={buttonThemes.standard}>
            Accept Invite
          </Button>
          <Button variant="outline" onClick={popModal}>
            Cancel
          </Button>
        </div>
      </>
    );
  } else {
    content = (
      <>
        <div className={css.group}>
          <div className={css.heading}>Invite invalid</div>
          <div className={css.text}>
            This invite link may be expired, please try again with another
            invite link
          </div>
        </div>
        <hr />
        <Button
          variant="filled"
          buttonColor={buttonThemes.standard}
          onClick={popModal}
        >
          Return to Comm
        </Button>
      </>
    );
  }

  return (
    <ModalOverlay onClose={popModal}>
      <div className={css.container}>{content}</div>
    </ModalOverlay>
  );
}

export default AcceptInviteModal;
