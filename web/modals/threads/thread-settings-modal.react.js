// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import {
  deleteThreadActionTypes,
  deleteThread,
  changeThreadSettingsActionTypes,
  changeThreadSettings,
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
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Button from '../../components/button.react';
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
    const callDeleteThread = useServerCall(deleteThread);
    const callChangeThreadSettings = useServerCall(changeThreadSettings);
    const dispatchActionPromise = useDispatchActionPromise();
    const threadInfo: ?ThreadInfo = useSelector(
      state => threadInfoSelector(state)[props.threadID],
    );
    const modalContext = useModalContext();
    const [errorMessage, setErrorMessage] = React.useState('');
    const [accountPassword, setAccountPassword] = React.useState('');
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

    const changeQueued: boolean = React.useMemo(
      () =>
        Object.values(queuedChanges).some(v => v !== null && v !== undefined),
      [queuedChanges],
    );

    const onChangeAccountPassword = React.useCallback(
      (event: SyntheticEvent<HTMLInputElement>) => {
        const target = event.currentTarget;
        setAccountPassword(target.value);
      },
      [],
    );

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

    const deleteThreadAction = React.useCallback(async () => {
      invariant(threadInfo, 'threadInfo should exist in deleteThreadAction');
      try {
        const response = await callDeleteThread(threadInfo.id, accountPassword);
        modalContext.popModal();
        return response;
      } catch (e) {
        setErrorMessage(
          e.message === 'invalid_credentials'
            ? 'wrong password'
            : 'unknown error',
        );
        setAccountPassword('');
        // TODO: accountPasswordInput.focus()
        // (once ref is moved up to functional component)
        throw e;
      }
    }, [accountPassword, callDeleteThread, modalContext, threadInfo]);

    const onDelete = React.useCallback(
      (event: SyntheticEvent<HTMLElement>) => {
        event.preventDefault();
        dispatchActionPromise(deleteThreadActionTypes, deleteThreadAction());
      },
      [deleteThreadAction, dispatchActionPromise],
    );

    const changeThreadSettingsAction = React.useCallback(async () => {
      invariant(
        threadInfo,
        'threadInfo should exist in changeThreadSettingsAction',
      );
      try {
        const response = await callChangeThreadSettings({
          threadID: threadInfo.id,
          changes: queuedChanges,
        });
        modalContext.popModal();
        return response;
      } catch (e) {
        setErrorMessage('unknown_error');
        setAccountPassword('');
        setCurrentTabType('general');
        setQueuedChanges(Object.freeze({}));
        // TODO: nameInput.focus()
        // (once ref is moved up to functional component)
        throw e;
      }
    }, [callChangeThreadSettings, modalContext, queuedChanges, threadInfo]);

    const onSubmit = React.useCallback(
      (event: SyntheticEvent<HTMLElement>) => {
        event.preventDefault();
        dispatchActionPromise(
          changeThreadSettingsActionTypes,
          changeThreadSettingsAction(),
        );
      },
      [changeThreadSettingsAction, dispatchActionPromise],
    );

    React.useEffect(() => {
      // TODO: nameInput.focus()
      // (once ref is moved up to functional component)

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
        />
      );
    } else if (currentTabType === 'privacy') {
      mainContent = (
        <ThreadSettingsPrivacyTab
          inputDisabled={inputDisabled}
          threadInfo={threadInfo}
          queuedChanges={queuedChanges}
          setQueuedChanges={setQueuedChanges}
        />
      );
    } else if (currentTabType === 'delete') {
      mainContent = (
        <ThreadSettingsDeleteTab
          accountPassword={accountPassword}
          onChangeAccountPassword={onChangeAccountPassword}
          inputDisabled={inputDisabled}
        />
      );
    }

    let buttons;
    if (currentTabType === 'delete') {
      buttons = (
        <Button onClick={onDelete} variant="danger" disabled={inputDisabled}>
          Delete
        </Button>
      );
    } else {
      buttons = (
        <Button
          type="submit"
          onClick={onSubmit}
          disabled={inputDisabled || !changeQueued}
          className={css.save_button}
        >
          Save
        </Button>
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
              {buttons}
              <div className={css.modal_form_error}>{errorMessage}</div>
            </div>
          </form>
        </div>
      </Modal>
    );
  },
);

export default ConnectedThreadSettingsModal;
