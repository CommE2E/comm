// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import type { InviteLink } from 'lib/types/link-types.js';

import EditLinkModal from './manage/edit-link-modal.react.js';
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
  const { popModal } = useModalContext();

  const [modalStage, setModalStage] = React.useState('view');
  const enterEditMode = React.useCallback(() => setModalStage('edit'), []);
  const enterViewMode = React.useCallback(() => setModalStage('view'), []);

  if (modalStage === 'edit') {
    return (
      <EditLinkModal inviteLink={inviteLink} enterViewMode={enterViewMode} />
    );
  }

  let content;
  if (inviteLink) {
    content = (
      <ExistingLinkContent
        inviteLink={inviteLink}
        enterEditMode={enterEditMode}
      />
    );
  } else {
    content = <EmptyLinkContent enterEditMode={enterEditMode} />;
  }

  return (
    <Modal name="Manage invite links" onClose={popModal} size="large">
      <div className={css.container}>{content}</div>
    </Modal>
  );
}

export default ManageInviteLinksModal;
