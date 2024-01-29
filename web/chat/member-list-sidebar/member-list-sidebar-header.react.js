// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import css from './member-list-sidebar-header.css';
import { useMemberListSidebarContext } from './member-list-sidebar-provider.react.js';
import AddButton from '../../components/add-button.react.js';
import { AddMembersModal } from '../../modals/threads/members/add-members-modal.react.js';

type Props = {
  +threadID: string,
};

function MemberListSidebarHeader(props: Props): React.Node {
  const { threadID } = props;

  const { pushModal, popModal } = useModalContext();

  const onClickAddButton = React.useCallback(() => {
    pushModal(<AddMembersModal onClose={popModal} threadID={threadID} />);
  }, [popModal, pushModal, threadID]);

  const { setShowMemberListSidebar } = useMemberListSidebarContext();

  const onClickCloseButton = React.useCallback(() => {
    setShowMemberListSidebar(false);
  }, [setShowMemberListSidebar]);

  const memberListSidebarHeader = React.useMemo(
    () => (
      <>
        <div className={css.container}>
          <div className={css.headerContent}>
            <div className={css.headerLabel}>Member list</div>
            <AddButton onClick={onClickAddButton} />
          </div>
          <div className={css.closeButton} onClick={onClickCloseButton}>
            <SWMansionIcon icon="cross-small" size={24} />
          </div>
        </div>
      </>
    ),
    [onClickAddButton, onClickCloseButton],
  );

  return memberListSidebarHeader;
}

export default MemberListSidebarHeader;
