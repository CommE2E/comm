// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import type { InviteLink } from 'lib/types/link-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import CopyInviteLinkButton from './copy-invite-link-button.react.js';
import css from './view-invite-link-modal.css';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +inviteLink: InviteLink,
};

function ViewInviteLinkModal(props: Props): React.Node {
  const { inviteLink } = props;
  const threadInfo = useSelector(
    state => threadInfoSelector(state)[inviteLink.communityID],
  );
  const resolvedThreadInfo = useResolvedThreadInfo(threadInfo);
  const { popModal } = useModalContext();

  return (
    <Modal
      name={`Invite people to ${resolvedThreadInfo.uiName}`}
      onClose={popModal}
      size="fit-content"
    >
      <div className={css.container}>
        <div className={css.description}>
          Use this public link to invite your friends into the community!
        </div>
        <div className={css.sectionHeader}>Public link</div>
        <CopyInviteLinkButton inviteLink={inviteLink} />
      </div>
    </Modal>
  );
}

export default ViewInviteLinkModal;
