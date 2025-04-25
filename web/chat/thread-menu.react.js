// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  leaveThreadActionTypes,
  useLeaveThread,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { usePromoteSidebar } from 'lib/hooks/promote-sidebar.react.js';
import { childThreadInfos } from 'lib/selectors/thread-selectors.js';
import {
  type OutboundDMOperationSpecification,
  dmOperationSpecificationTypes,
} from 'lib/shared/dm-ops/dm-op-types.js';
import { useProcessAndSendDMOperation } from 'lib/shared/dm-ops/process-dm-ops.js';
import {
  threadIsChannel,
  useThreadHasPermission,
  viewerIsMember,
} from 'lib/shared/thread-utils.js';
import {
  threadSpecs,
  threadTypeIsPersonal,
  threadTypeIsPrivate,
  threadTypeIsSidebar,
} from 'lib/shared/threads/thread-specs.js';
import { type DMLeaveThreadOperation } from 'lib/types/dm-ops.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import {
  threadTypeIsThick,
  thickThreadTypes,
} from 'lib/types/thread-types-enum.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

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
    if (
      threadTypeIsPersonal(threadInfo.type) ||
      threadTypeIsPrivate(threadInfo.type)
    ) {
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
    if (
      !threadSpecs[threadInfo.type].protocol.presentationDetails
        .supportsMediaGallery
    ) {
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
  }, [onClickThreadMediaGallery, threadInfo.type]);

  const childThreads = useSelector(
    state => childThreadInfos(state)[threadInfo.id],
  );

  const hasSidebars = React.useMemo(() => {
    return childThreads?.some(childThreadInfo =>
      threadTypeIsSidebar(childThreadInfo.type),
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

  const canCreateSubchannels = useThreadHasPermission(
    threadInfo,
    threadPermissions.CREATE_SUBCHANNELS,
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
  const callLeaveThread = useLeaveThread();
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const onConfirmLeaveThread = React.useCallback(() => {
    if (threadTypeIsThick(threadInfo.type)) {
      invariant(viewerID, 'viewerID should be set');
      const op: DMLeaveThreadOperation = {
        type: 'leave_thread',
        editorID: viewerID,
        time: Date.now(),
        messageID: uuid.v4(),
        threadID: threadInfo.id,
      };
      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
      };
      void processAndSendDMOperation(opSpecification);
    } else {
      void dispatchActionPromise(
        leaveThreadActionTypes,
        callLeaveThread({ threadID: threadInfo.id }),
      );
    }
    popModal();
  }, [
    threadInfo.type,
    threadInfo.id,
    threadInfo.parentThreadID,
    popModal,
    viewerID,
    processAndSendDMOperation,
    dispatchActionPromise,
    callLeaveThread,
  ]);

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

  const canLeaveThread = useThreadHasPermission(
    threadInfo,
    threadPermissions.LEAVE_THREAD,
  );
  const leaveThreadItem = React.useMemo(() => {
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
  }, [onClickLeaveThread, threadInfo, canLeaveThread]);

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
