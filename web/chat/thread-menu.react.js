// @flow

import * as React from 'react';

import {
  leaveThread,
  leaveThreadActionTypes,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { usePromoteSidebar } from 'lib/hooks/promote-sidebar.react.js';
import { childThreadInfos } from 'lib/selectors/thread-selectors.js';
import {
  threadHasPermission,
  viewerIsMember,
  threadIsChannel,
} from 'lib/shared/thread-utils.js';
import {
  type ThreadInfo,
  threadTypes,
  threadPermissions,
} from 'lib/types/thread-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import css from './thread-menu.css';
import MenuItem from '../components/menu-item.react.js';
import Menu from '../components/menu.react.js';
import SidebarPromoteModal from '../modals/chat/sidebar-promote-modal.react.js';
import ConfirmLeaveThreadModal from '../modals/threads/confirm-leave-thread-modal.react.js';
import ComposeSubchannelModal from '../modals/threads/create/compose-subchannel-modal.react.js';
import ThreadSettingsMediaGalleryModal from '../modals/threads/gallery/thread-settings-media-gallery.react.js';
import ThreadMembersModal from '../modals/threads/members/members-modal.react.js';
import ThreadNotificationsModal from '../modals/threads/notifications/notifications-modal.react.js';
import ThreadSettingsModal from '../modals/threads/settings/thread-settings-modal.react.js';
import SidebarsModal from '../modals/threads/sidebars/sidebars-modal.react.js';
import SubchannelsModal from '../modals/threads/subchannels/subchannels-modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

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
        icon="settings"
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

  const canViewThreadMediaGallery = React.useMemo(() => {
    return threadInfo.parentThreadID === '1';
  }, [threadInfo]);

  const onClickThreadMediaGallery = React.useCallback(
    () =>
      pushModal(
        <ThreadSettingsMediaGalleryModal
          onClose={popModal}
          parentThreadInfo={threadInfo}
          limit={36}
          activeTab="All"
        />,
      ),
    [popModal, pushModal, threadInfo],
  );

  const threadMediaGalleryItem = React.useMemo(() => {
    if (!canViewThreadMediaGallery) {
      return null;
    }
    return (
      <MenuItem
        key="threadMediaGallery"
        text="Media"
        icon="image-1"
        onClick={onClickThreadMediaGallery}
      />
    );
  }, [canViewThreadMediaGallery, onClickThreadMediaGallery]);

  const childThreads = useSelector(
    state => childThreadInfos(state)[threadInfo.id],
  );

  const hasSidebars = React.useMemo(() => {
    return childThreads?.some(
      childThreadInfo => childThreadInfo.type === threadTypes.SIDEBAR,
    );
  }, [childThreads]);

  const onClickSidebars = React.useCallback(
    () =>
      pushModal(<SidebarsModal threadID={threadInfo.id} onClose={popModal} />),
    [popModal, pushModal, threadInfo.id],
  );

  const sidebarItem = React.useMemo(() => {
    if (!hasSidebars) {
      return null;
    }
    return (
      <MenuItem
        key="sidebars"
        text="Threads"
        icon="arrow-right"
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

  const onClickCreateSubchannel = React.useCallback(
    () =>
      pushModal(
        <ComposeSubchannelModal
          parentThreadInfo={threadInfo}
          onClose={popModal}
        />,
      ),
    [popModal, pushModal, threadInfo],
  );

  const createSubchannelsItem = React.useMemo(() => {
    if (!canCreateSubchannels) {
      return null;
    }
    return (
      <MenuItem
        key="newSubchannel"
        text="Create new subchannel"
        icon="plus-circle"
        onClick={onClickCreateSubchannel}
      />
    );
  }, [canCreateSubchannels, onClickCreateSubchannel]);

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
        text="Leave chat"
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
        text="Promote to channel"
        icon="message-square-lines"
        onClick={onClickPromoteSidebarToThread}
      />
    );
  }, [onClickPromoteSidebarToThread]);

  const onClickNotifications = React.useCallback(() => {
    pushModal(
      <ThreadNotificationsModal threadID={threadInfo.id} onClose={popModal} />,
    );
  }, [popModal, pushModal, threadInfo.id]);

  const notificationsItem = React.useMemo(() => {
    if (!viewerIsMember(threadInfo)) {
      return null;
    }
    return (
      <MenuItem
        key="notifications"
        text="Notifications"
        icon="bell"
        onClick={onClickNotifications}
      />
    );
  }, [onClickNotifications, threadInfo]);

  const menuItems = React.useMemo(() => {
    const separator = <hr key="separator" className={css.separator} />;

    const items = [
      settingsItem,
      notificationsItem,
      membersItem,
      threadMediaGalleryItem,
      sidebarItem,
      viewSubchannelsItem,
      createSubchannelsItem,
      leaveThreadItem && separator,
      canPromoteSidebar && promoteSidebar,
      leaveThreadItem,
    ];
    return items.filter(Boolean);
  }, [
    settingsItem,
    notificationsItem,
    membersItem,
    threadMediaGalleryItem,
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
