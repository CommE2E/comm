// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { InviteLink } from 'lib/types/link-types.js';

import CopyInviteLinkButton from './copy-invite-link-button.react.js';
import css from './view-invite-link-modal.css';
import Modal from '../modals/modal.react.js';

type Props = {
  +inviteLink: InviteLink,
};

function ViewInviteLinkModal(props: Props): React.Node {
  const { inviteLink } = props;
  const { popModal } = useModalContext();

  return (
    <Modal name="Invite link" onClose={popModal} size="large">
      <div className={css.container}>
        <div className={css.description}>
          Share this invite link to help your friends join your community!
        </div>
        <div className={css.sectionHeader}>Public link</div>
        <CopyInviteLinkButton inviteLink={inviteLink} />
      </div>
    </Modal>
  );
}

export default ViewInviteLinkModal;
