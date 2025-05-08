// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  changeThreadSettingsActionTypes,
  deleteThreadActionTypes,
} from 'lib/actions/thread-action-types.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { getAvailableRelationshipButtons } from 'lib/shared/relationship-utils.js';
import {
  getSingleOtherUser,
  threadUIName,
  useThreadHasPermission,
} from 'lib/shared/thread-utils.js';
import { threadTypeIsPersonal } from 'lib/shared/threads/thread-specs.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { RelationshipButton } from 'lib/types/relationship-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { type ThreadChanges } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import ThreadSettingsDeleteButton from './thread-settings-delete-button.react.js';
import ThreadSettingsDeleteTab from './thread-settings-delete-tab.react.js';
import ThreadSettingsGeneralTab from './thread-settings-general-tab.react.js';
import css from './thread-settings-modal.css';
import ThreadSettingsPrivacyTab from './thread-settings-privacy-tab.react.js';
import ThreadSettingsRelationshipTab from './thread-settings-relationship-tab.react.js';
import ThreadSettingsSaveButton from './thread-settings-save-button.react.js';
import Tabs, { type TabData } from '../../../components/tabs.react.js';
import { useSelector } from '../../../redux/redux-utils.js';
import Modal from '../../modal.react.js';

type TabType = 'general' | 'privacy' | 'delete' | 'relationship';
type BaseProps = {
  +threadID: string,
};

const deleteThreadLoadingStatusSelector = createLoadingStatusSelector(
  deleteThreadActionTypes,
);
const changeThreadSettingsLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
);

const ConnectedThreadSettingsModal: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedThreadSettingsModal(props) {
    const changeInProgress = useSelector(
      state =>
        deleteThreadLoadingStatusSelector(state) === 'loading' ||
        changeThreadSettingsLoadingStatusSelector(state) === 'loading',
    );
    const threadInfo: ?ThreadInfo = useSelector(
      state => threadInfoSelector(state)[props.threadID],
    );
    const modalContext = useModalContext();
    const [errorMessage, setErrorMessage] = React.useState<?string>('');
    const [currentTabType, setCurrentTabType] =
      React.useState<TabType>('general');
    const [queuedChanges, setQueuedChanges] = React.useState<ThreadChanges>(
      Object.freeze({}),
    );

    const threadInfoWithNoName = React.useMemo(() => {
      invariant(threadInfo, 'threadInfo should exist in threadInfoWithNoName');
      if (threadInfo.name === null || threadInfo.name === undefined) {
        return threadInfo;
      }
      const withNoName = { ...threadInfo, name: undefined };
      return {
        ...withNoName,
        uiName: threadUIName(withNoName),
      };
    }, [threadInfo]);
    const resolvedThreadInfo = useResolvedThreadInfo(threadInfoWithNoName);
    const namePlaceholder = resolvedThreadInfo.uiName;

    const viewerID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );
    const userInfos = useSelector(state => state.userStore.userInfos);
    const otherMemberID = React.useMemo(() => {
      if (!threadInfo) {
        return null;
      }
      return getSingleOtherUser(threadInfo, viewerID);
    }, [threadInfo, viewerID]);
    const otherUserInfo = otherMemberID ? userInfos[otherMemberID] : null;

    const availableRelationshipActions = React.useMemo(() => {
      if (
        !otherUserInfo ||
        !threadInfo?.type ||
        !threadTypeIsPersonal(threadInfo.type)
      ) {
        return ([]: RelationshipButton[]);
      }
      return getAvailableRelationshipButtons(otherUserInfo);
    }, [otherUserInfo, threadInfo?.type]);

    const canEditThreadName = useThreadHasPermission(
      threadInfo,
      threadPermissions.EDIT_THREAD_NAME,
    );
    const canEditThreadColor = useThreadHasPermission(
      threadInfo,
      threadPermissions.EDIT_THREAD_COLOR,
    );
    const canEditThreadDescription = useThreadHasPermission(
      threadInfo,
      threadPermissions.EDIT_THREAD_DESCRIPTION,
    );
    const canEditThreadPermissions = useThreadHasPermission(
      threadInfo,
      threadPermissions.EDIT_PERMISSIONS,
    );
    const canDeleteThread = useThreadHasPermission(
      threadInfo,
      threadPermissions.DELETE_THREAD,
    );

    const hasPermissionForTab = React.useCallback(
      // ESLint doesn't recognize that invariant always throws
      // eslint-disable-next-line consistent-return
      (tab: TabType) => {
        if (tab === 'general') {
          return (
            canEditThreadName || canEditThreadColor || canEditThreadDescription
          );
        } else if (tab === 'privacy') {
          return canEditThreadPermissions;
        } else if (tab === 'delete') {
          return canDeleteThread;
        } else if (tab === 'relationship') {
          return true;
        }
        invariant(false, `invalid tab: ${tab}`);
      },
      [
        canEditThreadName,
        canEditThreadColor,
        canEditThreadDescription,
        canEditThreadPermissions,
        canDeleteThread,
      ],
    );

    React.useEffect(() => {
      if (
        currentTabType !== 'general' &&
        !hasPermissionForTab(currentTabType)
      ) {
        setCurrentTabType('general');
      }
    }, [currentTabType, hasPermissionForTab]);

    React.useEffect(() => () => setErrorMessage(''), [currentTabType]);

    const tabsData: $ReadOnlyArray<TabData<TabType>> = React.useMemo(() => {
      if (!threadInfo) {
        return [];
      }

      const result = [{ id: 'general', header: 'General' }];

      // This UI needs to be updated to handle sidebars but we haven't gotten
      // there yet. We'll probably end up ripping it out anyways, so for now we
      // are just hiding the privacy tab for any thread that was created as a
      // sidebar
      const canSeePrivacyTab =
        (queuedChanges['parentThreadID'] ?? threadInfo['parentThreadID']) &&
        !threadInfo.sourceMessageID &&
        (threadInfo.type === threadTypes.COMMUNITY_OPEN_SUBTHREAD ||
          threadInfo.type === threadTypes.COMMUNITY_SECRET_SUBTHREAD);

      if (canSeePrivacyTab) {
        result.push({ id: 'privacy', header: 'Privacy' });
      }

      if (availableRelationshipActions.length > 0 && otherUserInfo) {
        result.push({ id: 'relationship', header: 'Relationship' });
      }

      if (hasPermissionForTab('delete')) {
        result.push({ id: 'delete', header: 'Delete' });
      }

      return result;
    }, [
      availableRelationshipActions.length,
      hasPermissionForTab,
      otherUserInfo,
      queuedChanges,
      threadInfo,
    ]);

    const tabs = React.useMemo(
      () => (
        <Tabs
          tabItems={tabsData}
          activeTab={currentTabType}
          setTab={setCurrentTabType}
        />
      ),
      [currentTabType, tabsData],
    );

    const tabContent = React.useMemo(() => {
      if (!threadInfo) {
        return null;
      }
      if (currentTabType === 'general') {
        return (
          <ThreadSettingsGeneralTab
            threadSettingsOperationInProgress={changeInProgress}
            threadInfo={threadInfo}
            threadNamePlaceholder={namePlaceholder}
            queuedChanges={queuedChanges}
            setQueuedChanges={setQueuedChanges}
          />
        );
      }
      if (currentTabType === 'privacy') {
        return (
          <ThreadSettingsPrivacyTab
            threadInfo={threadInfo}
            queuedChanges={queuedChanges}
            setQueuedChanges={setQueuedChanges}
          />
        );
      }
      if (currentTabType === 'relationship') {
        invariant(otherUserInfo, 'otherUserInfo should be set');
        return (
          <ThreadSettingsRelationshipTab
            setErrorMessage={setErrorMessage}
            relationshipButtons={availableRelationshipActions}
            otherUserInfo={otherUserInfo}
          />
        );
      }
      return <ThreadSettingsDeleteTab />;
    }, [
      availableRelationshipActions,
      changeInProgress,
      currentTabType,
      namePlaceholder,
      otherUserInfo,
      queuedChanges,
      threadInfo,
    ]);

    const primaryButton = React.useMemo(() => {
      if (!threadInfo) {
        return null;
      }

      if (currentTabType === 'general' || currentTabType === 'privacy') {
        return (
          <ThreadSettingsSaveButton
            activeTab={currentTabType}
            threadInfo={threadInfo}
            queuedChanges={queuedChanges}
            setQueuedChanges={setQueuedChanges}
            setErrorMessage={setErrorMessage}
            threadSettingsOperationInProgress={changeInProgress}
          />
        );
      }

      if (currentTabType === 'relationship') {
        return <div className={css.relationshipPrimaryButtonPlaceholder} />;
      }

      return (
        <ThreadSettingsDeleteButton
          threadInfo={threadInfo}
          threadSettingsOperationInProgress={changeInProgress}
          setErrorMessage={setErrorMessage}
        />
      );
    }, [changeInProgress, currentTabType, queuedChanges, threadInfo]);

    if (!threadInfo) {
      return (
        <Modal onClose={modalContext.popModal} name="Invalid chat">
          <div className={css.modal_body}>
            <p>You no longer have permission to view this chat</p>
          </div>
        </Modal>
      );
    }

    return (
      <Modal
        name="Chat settings"
        onClose={modalContext.popModal}
        icon="settings"
        size="fit-content"
        subheader={tabs}
        primaryButton={primaryButton}
      >
        <div className={css.modal_body}>
          <div className={css.tab_body}>{tabContent}</div>
          <div className={css.errorMessage}>{errorMessage}</div>
        </div>
      </Modal>
    );
  });

export default ConnectedThreadSettingsModal;
