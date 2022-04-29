// @flow

import * as React from 'react';

import {
  leaveThread,
  leaveThreadActionTypes,
} from 'lib/actions/thread-actions';
import { usePromoteSidebar } from 'lib/hooks/promote-sidebar.react';
import { childThreadInfos } from 'lib/selectors/thread-selectors';
import {
  threadHasPermission,
  viewerIsMember,
  threadIsChannel,
} from 'lib/shared/thread-utils';
import {
  type ThreadInfo,
  threadTypes,
  threadPermissions,
} from 'lib/types/thread-types';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import MenuItem from '../components/menu-item.react';
import Menu from '../components/menu.react';
import SidebarListModal from '../modals/chat/sidebar-list-modal.react';
import SidebarPromoteModal from '../modals/chat/sidebar-promote-modal.react';
import { useModalContext } from '../modals/modal-provider.react';
import ConfirmLeaveThreadModal from '../modals/threads/confirm-leave-thread-modal.react';
import ThreadMembersModal from '../modals/threads/members/members-modal.react';
import SubchannelsModal from '../modals/threads/subchannels/subchannels-modal.react';
import ThreadSettingsModal from '../modals/threads/thread-settings-modal.react';
import { useSelector } from '../redux/redux-utils';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './thread-menu.css';

type ThreadMenuProps = {
  +threadInfo: ThreadInfo,
};

function ThreadMenu(props: ThreadMenuProps): React.Node {
  const { pushModal, popModal } = useModalContext();
  const { threadInfo } = props;
  const { onPromoteSidebar, canPromoteSidebar } = usePromoteSidebar(threadInfo);

  const onClickSettings = React.useCallback(
    () => pushModal(<ThreadSettingsModal threadID={threadInfo.id} />),
    [pushModal, threadInfo.id],
  );

  const settingsItem = React.useMemo(() => {
    return (
      <MenuItem
        key="settings"
        text="Settings"
        icon="wrench"
        onClick={onClickSettings}
      />
    );
  }, [onClickSettings]);

  const onClickMembers = React.useCallback(
    () =>
      pushModal(
        <ThreadMembersModal threadID={threadInfo.id} onClose={popModal} />,
      ),
    [popModal, pushModal, threadInfo.id],
  );
  const membersItem = React.useMemo(() => {
    if (threadInfo.type === threadTypes.PERSONAL) {
      return null;
    }
    return (
      <MenuItem
        key="members"
        text="Members"
        icon="users"
        onClick={onClickMembers}
      />
    );
  }, [onClickMembers, threadInfo.type]);

  const childThreads = useSelector(
    state => childThreadInfos(state)[threadInfo.id],
  );

  const hasSidebars = React.useMemo(() => {
    return childThreads?.some(
      childThreadInfo => childThreadInfo.type === threadTypes.SIDEBAR,
    );
  }, [childThreads]);

  const onClickSidebars = React.useCallback(
    () => pushModal(<SidebarListModal threadInfo={threadInfo} />),
    [pushModal, threadInfo],
  );

  const sidebarItem = React.useMemo(() => {
    if (!hasSidebars) {
      return null;
    }
    return (
      <MenuItem
        key="sidebars"
        text="Sidebars"
        icon="arrow-right-small"
        onClick={onClickSidebars}
      />
    );
  }, [hasSidebars, onClickSidebars]);

  const canCreateSubchannels = React.useMemo(
    () => threadHasPermission(threadInfo, threadPermissions.CREATE_SUBCHANNELS),
    [threadInfo],
  );

  const hasSubchannels = React.useMemo(() => {
    return !!childThreads?.some(threadIsChannel);
  }, [childThreads]);

  const onClickViewSubchannels = React.useCallback(
    () =>
      pushModal(
        <SubchannelsModal threadID={threadInfo.id} onClose={popModal} />,
      ),
    [popModal, pushModal, threadInfo.id],
  );

  const viewSubchannelsItem = React.useMemo(() => {
    if (!hasSubchannels) {
      return null;
    }
    return (
      <MenuItem
        key="subchannels"
        text="Subchannels"
        icon="message-square"
        onClick={onClickViewSubchannels}
      />
    );
  }, [hasSubchannels, onClickViewSubchannels]);

  const createSubchannelsItem = React.useMemo(() => {
    if (!canCreateSubchannels) {
      return null;
    }
    return (
      <MenuItem
        key="newSubchannel"
        text="Create new subchannel"
        icon="plus-circle"
      />
    );
  }, [canCreateSubchannels]);

  const dispatchActionPromise = useDispatchActionPromise();
  const callLeaveThread = useServerCall(leaveThread);

  const onConfirmLeaveThread = React.useCallback(() => {
    dispatchActionPromise(
      leaveThreadActionTypes,
      callLeaveThread(threadInfo.id),
    );
    popModal();
  }, [callLeaveThread, popModal, dispatchActionPromise, threadInfo.id]);

  const onClickLeaveThread = React.useCallback(
    () =>
      pushModal(
        <ConfirmLeaveThreadModal
          threadInfo={threadInfo}
          onClose={popModal}
          onConfirm={onConfirmLeaveThread}
        />,
      ),
    [popModal, onConfirmLeaveThread, pushModal, threadInfo],
  );

  const leaveThreadItem = React.useMemo(() => {
    const canLeaveThread = threadHasPermission(
      threadInfo,
      threadPermissions.LEAVE_THREAD,
    );
    if (!viewerIsMember(threadInfo) || !canLeaveThread) {
      return null;
    }
    return (
      <MenuItem
        key="leave"
        text="Leave Thread"
        icon="logout"
        dangerous
        onClick={onClickLeaveThread}
      />
    );
  }, [onClickLeaveThread, threadInfo]);

  const onClickPromoteSidebarToThread = React.useCallback(
    () =>
      pushModal(
        <SidebarPromoteModal
          threadInfo={threadInfo}
          onClose={popModal}
          onConfirm={onPromoteSidebar}
        />,
      ),
    [pushModal, threadInfo, popModal, onPromoteSidebar],
  );

  const promoteSidebar = React.useMemo(() => {
    return (
      <MenuItem
        key="promote"
        text="Promote Thread"
        icon="message-square-lines"
        onClick={onClickPromoteSidebarToThread}
      />
    );
  }, [onClickPromoteSidebarToThread]);

  const menuItems = React.useMemo(() => {
    const notificationsItem = (
      <MenuItem key="notifications" text="Notifications" icon="bell" />
    );
    const separator = <hr key="separator" className={css.separator} />;

    // TODO: Enable menu items when the modals are implemented
    const SHOW_NOTIFICATIONS = false;
    const SHOW_CREATE_SUBCHANNELS = false;

    const items = [
      settingsItem,
      SHOW_NOTIFICATIONS && notificationsItem,
      membersItem,
      sidebarItem,
      viewSubchannelsItem,
      SHOW_CREATE_SUBCHANNELS && createSubchannelsItem,
      leaveThreadItem && separator,
      canPromoteSidebar && promoteSidebar,
      leaveThreadItem,
    ];
    return items.filter(Boolean);
  }, [
    settingsItem,
    membersItem,
    sidebarItem,
    viewSubchannelsItem,
    promoteSidebar,
    createSubchannelsItem,
    leaveThreadItem,
    canPromoteSidebar,
  ]);
  const icon = React.useMemo(
    () => <SWMansionIcon icon="menu-vertical" size={20} />,
    [],
  );
  return <Menu icon={icon}>{menuItems}</Menu>;
}

export default ThreadMenu;
