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
import { type SetState } from 'lib/types/hook-types.js';
import {
  type ThreadInfo,
  threadTypes,
  assertThreadType,
  type ChangeThreadSettingsPayload,
  type UpdateThreadRequest,
  type LeaveThreadPayload,
  threadPermissions,
  type ThreadChanges,
} from 'lib/types/thread-types';
import type { UserInfos } from 'lib/types/user-types';
import {
  useDispatchActionPromise,
  useServerCall,
  type DispatchActionPromise,
} from 'lib/utils/action-utils';
import { firstLine } from 'lib/utils/string-utils';

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
type Props = {
  ...BaseProps,
  +threadInfo: ThreadInfo,
  +changeInProgress: boolean,
  +viewerID: ?string,
  +userInfos: UserInfos,
  +dispatchActionPromise: DispatchActionPromise,
  +deleteThread: (
    threadID: string,
    currentAccountPassword: string,
  ) => Promise<LeaveThreadPayload>,
  +changeThreadSettings: (
    update: UpdateThreadRequest,
  ) => Promise<ChangeThreadSettingsPayload>,
  +onClose: () => void,
  +errorMessage: string,
  +setErrorMessage: SetState<string>,
  +accountPassword: string,
  +setAccountPassword: SetState<string>,
  +currentTabType: TabType,
  +setCurrentTabType: SetState<TabType>,
  +queuedChanges: ThreadChanges,
  +setQueuedChanges: SetState<ThreadChanges>,
  +namePlaceholder: string,
  +changeQueued: boolean,
  +onChangeName: (event: SyntheticEvent<HTMLInputElement>) => void,
  +onChangeDescription: (event: SyntheticEvent<HTMLTextAreaElement>) => void,
  +onChangeColor: (color: string) => void,
  +onChangeThreadType: (event: SyntheticEvent<HTMLInputElement>) => void,
  +onChangeAccountPassword: (event: SyntheticEvent<HTMLInputElement>) => void,
  +hasPermissionForTab: (thread: ThreadInfo, tab: TabType) => boolean,
  +deleteThreadAction: () => Promise<LeaveThreadPayload>,
  +onDelete: (event: SyntheticEvent<HTMLElement>) => void,
  +changeThreadSettingsAction: () => Promise<ChangeThreadSettingsPayload>,
  +onSubmit: (event: SyntheticEvent<HTMLElement>) => void,
  +buttons: ?React.Node,
};
class ThreadSettingsModal extends React.PureComponent<Props> {
  constructor(props: Props) {
    super(props);
  }

  possiblyChangedValue(key: string) {
    const valueChanged =
      this.props.queuedChanges[key] !== null &&
      this.props.queuedChanges[key] !== undefined;
    return valueChanged
      ? this.props.queuedChanges[key]
      : this.props.threadInfo[key];
  }

  render() {
    const { threadInfo } = this.props;
    const inputDisabled =
      this.props.changeInProgress ||
      !this.props.hasPermissionForTab(threadInfo, this.props.currentTabType);

    let mainContent = null;
    if (this.props.currentTabType === 'general') {
      mainContent = (
        <ThreadSettingsGeneralTab
          threadNameValue={firstLine(this.possiblyChangedValue('name'))}
          threadNamePlaceholder={this.props.namePlaceholder}
          threadNameOnChange={this.props.onChangeName}
          threadNameDisabled={inputDisabled}
          threadDescriptionValue={this.possiblyChangedValue('description')}
          threadDescriptionOnChange={this.props.onChangeDescription}
          threadDescriptionDisabled={inputDisabled}
          threadColorCurrentColor={this.possiblyChangedValue('color')}
          threadColorOnColorSelection={this.props.onChangeColor}
        />
      );
    } else if (this.props.currentTabType === 'privacy') {
      mainContent = (
        <ThreadSettingsPrivacyTab
          possiblyChangedThreadType={this.possiblyChangedValue('type')}
          onChangeThreadType={this.props.onChangeThreadType}
          inputDisabled={inputDisabled}
        />
      );
    } else if (this.props.currentTabType === 'delete') {
      mainContent = (
        <ThreadSettingsDeleteTab
          accountPassword={this.props.accountPassword}
          onChangeAccountPassword={this.props.onChangeAccountPassword}
          inputDisabled={inputDisabled}
        />
      );
    }

    const tabs = [
      <Tab
        name="General"
        tabType="general"
        onClick={this.props.setCurrentTabType}
        selected={this.props.currentTabType === 'general'}
        key="general"
      />,
    ];

    // This UI needs to be updated to handle sidebars but we haven't gotten
    // there yet. We'll probably end up ripping it out anyways, so for now we
    // are just hiding the privacy tab for any thread that was created as a
    // sidebar
    const canSeePrivacyTab =
      this.possiblyChangedValue('parentThreadID') &&
      threadInfo.sourceMessageID &&
      (threadInfo.type === threadTypes.COMMUNITY_OPEN_SUBTHREAD ||
        threadInfo.type === threadTypes.COMMUNITY_SECRET_SUBTHREAD);

    if (canSeePrivacyTab) {
      tabs.push(
        <Tab
          name="Privacy"
          tabType="privacy"
          onClick={this.props.setCurrentTabType}
          selected={this.props.currentTabType === 'privacy'}
          key="privacy"
        />,
      );
    }
    const canDeleteThread = this.props.hasPermissionForTab(
      threadInfo,
      'delete',
    );
    if (canDeleteThread) {
      tabs.push(
        <Tab
          name="Delete"
          tabType="delete"
          onClick={this.props.setCurrentTabType}
          selected={this.props.currentTabType === 'delete'}
          key="delete"
        />,
      );
    }

    return (
      <Modal name="Thread settings" onClose={this.props.onClose}>
        <ul className={css.tab_panel}>{tabs}</ul>
        <div className={css.modal_body}>
          <form method="POST">
            {mainContent}
            <div className={css.form_footer}>
              {this.props.buttons}
              <div className={css.modal_form_error}>
                {this.props.errorMessage}
              </div>
            </div>
          </form>
        </div>
      </Modal>
    );
  }
}

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

    const onChangeName = React.useCallback(
      (event: SyntheticEvent<HTMLInputElement>) => {
        const target = event.currentTarget;
        setQueuedChanges(
          Object.freeze({
            ...queuedChanges,
            name: firstLine(
              target.value !== threadInfo?.name ? target.value : undefined,
            ),
          }),
        );
      },
      [queuedChanges, threadInfo?.name],
    );

    const onChangeDescription = React.useCallback(
      (event: SyntheticEvent<HTMLTextAreaElement>) => {
        const target = event.currentTarget;
        setQueuedChanges(
          Object.freeze({
            ...queuedChanges,
            description:
              target.value !== threadInfo?.description
                ? target.value
                : undefined,
          }),
        );
      },
      [queuedChanges, threadInfo?.description],
    );

    const onChangeColor = React.useCallback(
      (color: string) => {
        setQueuedChanges(
          Object.freeze({
            ...queuedChanges,
            color: color !== threadInfo?.color ? color : undefined,
          }),
        );
      },
      [queuedChanges, threadInfo?.color],
    );

    const onChangeThreadType = React.useCallback(
      (event: SyntheticEvent<HTMLInputElement>) => {
        const uiValue = assertThreadType(
          parseInt(event.currentTarget.value, 10),
        );
        setQueuedChanges(
          Object.freeze({
            ...queuedChanges,
            type: uiValue !== threadInfo?.type ? uiValue : undefined,
          }),
        );
      },
      [queuedChanges, threadInfo?.type],
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

    return (
      <ThreadSettingsModal
        {...props}
        threadInfo={threadInfo}
        changeInProgress={changeInProgress}
        viewerID={viewerID}
        userInfos={userInfos}
        deleteThread={callDeleteThread}
        changeThreadSettings={callChangeThreadSettings}
        dispatchActionPromise={dispatchActionPromise}
        onClose={modalContext.popModal}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        accountPassword={accountPassword}
        setAccountPassword={setAccountPassword}
        currentTabType={currentTabType}
        setCurrentTabType={setCurrentTabType}
        queuedChanges={queuedChanges}
        setQueuedChanges={setQueuedChanges}
        namePlaceholder={namePlaceholder}
        changeQueued={changeQueued}
        onChangeName={onChangeName}
        onChangeDescription={onChangeDescription}
        onChangeColor={onChangeColor}
        onChangeThreadType={onChangeThreadType}
        onChangeAccountPassword={onChangeAccountPassword}
        hasPermissionForTab={hasPermissionForTab}
        deleteThreadAction={deleteThreadAction}
        onDelete={onDelete}
        changeThreadSettingsAction={changeThreadSettingsAction}
        onSubmit={onSubmit}
        buttons={buttons}
      />
    );
  },
);

export default ConnectedThreadSettingsModal;
