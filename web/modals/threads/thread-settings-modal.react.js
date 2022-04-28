// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import {
  deleteThreadActionTypes,
  changeThreadSettingsActionTypes,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { threadHasPermission, robotextName } from 'lib/shared/thread-utils';
import {
  type ThreadInfo,
  threadTypes,
  threadPermissions,
  type ThreadChanges,
} from 'lib/types/thread-types';

import { useModalContext } from '../../modals/modal-provider.react';
import { useSelector } from '../../redux/redux-utils';
import Modal from '../modal.react';
import ThreadSettingsDeleteTab from './thread-settings-delete-tab.react';
import ThreadSettingsGeneralTab from './thread-settings-general-tab.react';
import css from './thread-settings-modal.css';
import ThreadSettingsPrivacyTab from './thread-settings-privacy-tab.react';

type TabType = 'general' | 'privacy' | 'delete';
type TabProps = {
  +name: string,
  +tabType: TabType,
  +selected: boolean,
  +onClick: (tabType: TabType) => void,
};
class Tab extends React.PureComponent<TabProps> {
  render() {
    const classNamesForTab = classNames({
      [css['current-tab']]: this.props.selected,
      [css['delete-tab']]:
        this.props.selected && this.props.tabType === 'delete',
    });
    return (
      <li className={classNamesForTab} onClick={this.onClick}>
        <a>{this.props.name}</a>
      </li>
    );
  }

  onClick = () => {
    return this.props.onClick(this.props.tabType);
  };
}

type BaseProps = {
  +threadID: string,
};

const deleteThreadLoadingStatusSelector = createLoadingStatusSelector(
  deleteThreadActionTypes,
);
const changeThreadSettingsLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
);

const ConnectedThreadSettingsModal: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedThreadSettingsModal(props) {
    const changeInProgress = useSelector(
      state =>
        deleteThreadLoadingStatusSelector(state) === 'loading' ||
        changeThreadSettingsLoadingStatusSelector(state) === 'loading',
    );
    const viewerID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );
    const userInfos = useSelector(state => state.userStore.userInfos);
    const threadInfo: ?ThreadInfo = useSelector(
      state => threadInfoSelector(state)[props.threadID],
    );
    const modalContext = useModalContext();
    const [errorMessage, setErrorMessage] = React.useState('');
    const [currentTabType, setCurrentTabType] = React.useState<TabType>(
      'general',
    );
    const [queuedChanges, setQueuedChanges] = React.useState<ThreadChanges>(
      Object.freeze({}),
    );

    const namePlaceholder: string = React.useMemo(() => {
      invariant(threadInfo, 'threadInfo should exist in namePlaceholder');
      return robotextName(threadInfo, viewerID, userInfos);
    }, [threadInfo, userInfos, viewerID]);

    const hasPermissionForTab = React.useCallback(
      (thread: ThreadInfo, tab: TabType) => {
        if (tab === 'general') {
          return threadHasPermission(
            thread,
            threadPermissions.EDIT_THREAD_NAME,
          );
        } else if (tab === 'privacy') {
          return threadHasPermission(
            thread,
            threadPermissions.EDIT_PERMISSIONS,
          );
        } else if (tab === 'delete') {
          return threadHasPermission(thread, threadPermissions.DELETE_THREAD);
        }
        invariant(false, `invalid tab: ${tab}`);
      },
      [],
    );

    React.useEffect(() => {
      if (
        threadInfo &&
        currentTabType !== 'general' &&
        !hasPermissionForTab(threadInfo, currentTabType)
      ) {
        setCurrentTabType('general');
      }
    }, [currentTabType, hasPermissionForTab, threadInfo]);

    if (!threadInfo) {
      return (
        <Modal onClose={modalContext.popModal} name="Invalid thread">
          <div className={css.modal_body}>
            <p>You no longer have permission to view this thread</p>
          </div>
        </Modal>
      );
    }

    const inputDisabled =
      changeInProgress || !hasPermissionForTab(threadInfo, currentTabType);

    let mainContent;
    if (currentTabType === 'general') {
      mainContent = (
        <ThreadSettingsGeneralTab
          inputDisabled={inputDisabled}
          threadInfo={threadInfo}
          threadNamePlaceholder={namePlaceholder}
          queuedChanges={queuedChanges}
          setQueuedChanges={setQueuedChanges}
          setErrorMessage={setErrorMessage}
        />
      );
    } else if (currentTabType === 'privacy') {
      mainContent = (
        <ThreadSettingsPrivacyTab
          inputDisabled={inputDisabled}
          threadInfo={threadInfo}
          queuedChanges={queuedChanges}
          setQueuedChanges={setQueuedChanges}
          setErrorMessage={setErrorMessage}
        />
      );
    } else if (currentTabType === 'delete') {
      mainContent = (
        <ThreadSettingsDeleteTab
          inputDisabled={inputDisabled}
          threadInfo={threadInfo}
          setErrorMessage={setErrorMessage}
        />
      );
    }

    const tabs = [
      <Tab
        name="General"
        tabType="general"
        onClick={setCurrentTabType}
        selected={currentTabType === 'general'}
        key="general"
      />,
    ];

    // This UI needs to be updated to handle sidebars but we haven't gotten
    // there yet. We'll probably end up ripping it out anyways, so for now we
    // are just hiding the privacy tab for any thread that was created as a
    // sidebar
    const canSeePrivacyTab =
      (queuedChanges['parentThreadID'] ?? threadInfo['parentThreadID']) &&
      threadInfo.sourceMessageID &&
      (threadInfo.type === threadTypes.COMMUNITY_OPEN_SUBTHREAD ||
        threadInfo.type === threadTypes.COMMUNITY_SECRET_SUBTHREAD);

    if (canSeePrivacyTab) {
      tabs.push(
        <Tab
          name="Privacy"
          tabType="privacy"
          onClick={setCurrentTabType}
          selected={currentTabType === 'privacy'}
          key="privacy"
        />,
      );
    }

    const canDeleteThread = hasPermissionForTab(threadInfo, 'delete');
    if (canDeleteThread) {
      tabs.push(
        <Tab
          name="Delete"
          tabType="delete"
          onClick={setCurrentTabType}
          selected={currentTabType === 'delete'}
          key="delete"
        />,
      );
    }

    return (
      <Modal name="Thread settings" onClose={modalContext.popModal}>
        <ul className={css.tab_panel}>{tabs}</ul>
        <div className={css.modal_body}>
          <form method="POST">
            {mainContent}
            <div className={css.form_footer}>
              <div className={css.modal_form_error}>{errorMessage}</div>
            </div>
          </form>
        </div>
      </Modal>
    );
  },
);

export default ConnectedThreadSettingsModal;
