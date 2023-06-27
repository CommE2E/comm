// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import type { InviteLink } from 'lib/types/link-types.js';

import CopyInviteLinkButton from './copy-invite-link-button.react.js';
import css from './manage-invite-links-modal.css';
import Button from '../components/button.react.js';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +communityID: string,
};

const buttonColor = {
  color: 'var(--purple-link)',
};

function ManageInviteLinksModal(props: Props): React.Node {
  const { communityID } = props;
  const inviteLink: ?InviteLink = useSelector(primaryInviteLinksSelector)[
    communityID
  ];
  const { popModal } = useModalContext();

  let enableLinkButton = null;
  let publicLinkSection = null;
  if (inviteLink) {
    publicLinkSection = (
      <div>
        <CopyInviteLinkButton inviteLink={inviteLink} />
        <div className={css.description}>
          {'Public links allow unlimited uses and never expire. '}
          <Button
            variant="text"
            buttonColor={buttonColor}
            className={css.inlineButton}
          >
            Edit public link
          </Button>
        </div>
      </div>
    );
  } else {
    enableLinkButton = (
      <Button variant="text" buttonColor={buttonColor}>
        Enable
      </Button>
    );
  }

  return (
    <Modal name="Manage invite links" onClose={popModal} size="large">
      <div className={css.container}>
        <div className={css.sectionHeaderRow}>
          <div className={css.sectionHeaderText}>Public link</div>
          {enableLinkButton}
        </div>
        {publicLinkSection}
      </div>
    </Modal>
  );
}

export default ManageInviteLinksModal;
