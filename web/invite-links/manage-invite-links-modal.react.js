// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import type { InviteLink } from 'lib/types/link-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import EmptyLinkContent from './manage/empty-link-content.react.js';
import ExistingLinkContent from './manage/existing-link-content.react.js';
import css from './manage/manage-invite-links-modal.css';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +communityID: string,
};

function ManageInviteLinksModal(props: Props): React.Node {
  const { communityID } = props;
  const inviteLink: ?InviteLink = useSelector(primaryInviteLinksSelector)[
    communityID
  ];
  const community = useSelector(
    state => threadInfoSelector(state)[communityID],
  );
  const resolvedThreadInfo = useResolvedThreadInfo(community);
  const { popModal } = useModalContext();

  let content;
  if (inviteLink) {
    content = <ExistingLinkContent inviteLink={inviteLink} />;
  } else {
    content = <EmptyLinkContent />;
  }

  return (
    <Modal
      name={`Invite people to ${resolvedThreadInfo.uiName}`}
      onClose={popModal}
      size="large"
    >
      <div className={css.container}>{content}</div>
    </Modal>
  );
}

export default ManageInviteLinksModal;
