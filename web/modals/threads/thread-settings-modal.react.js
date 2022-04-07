// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import _pickBy from 'lodash/fp/pickBy';
import * as React from 'react';

import {
  deleteThreadActionTypes,
  deleteThread,
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  threadHasPermission,
  threadTypeDescriptions,
  robotextName,
} from 'lib/shared/thread-utils';
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
import ColorPicker from './color-picker.react';
import css from './thread-settings-modal.css';

const { COMMUNITY_OPEN_SUBTHREAD, COMMUNITY_SECRET_SUBTHREAD } = threadTypes;

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
};
type State = {
  +queuedChanges: ThreadChanges,
  +errorMessage: string,
  +accountPassword: string,
  +currentTabType: TabType,
};
class ThreadSettingsModal extends React.PureComponent<Props, State> {
  nameInput: ?HTMLInputElement;
  newThreadPasswordInput: ?HTMLInputElement;
  accountPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      queuedChanges: Object.freeze({}),
      errorMessage: '',
      accountPassword: '',
      currentTabType: 'general',
    };
  }

  componentDidMount() {
    invariant(this.nameInput, 'nameInput ref unset');
    this.nameInput.focus();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.currentTabType !== 'delete') {
      return;
    }

    const permissionForDeleteTab = this.hasPermissionForTab(
      this.props.threadInfo,
      'delete',
    );
    const prevPermissionForDeleteTab = this.hasPermissionForTab(
      prevProps.threadInfo,
      'delete',
    );

    if (!permissionForDeleteTab && prevPermissionForDeleteTab) {
      this.setTab('general');
    }
  }

  hasPermissionForTab(threadInfo: ThreadInfo, tab: TabType) {
    if (tab === 'general') {
      return threadHasPermission(
        threadInfo,
        threadPermissions.EDIT_THREAD_NAME,
      );
    } else if (tab === 'privacy') {
      return threadHasPermission(
        threadInfo,
        threadPermissions.EDIT_PERMISSIONS,
      );
    } else if (tab === 'delete') {
      return threadHasPermission(threadInfo, threadPermissions.DELETE_THREAD);
    }
    invariant(false, `invalid tab ${tab}`);
  }

  possiblyChangedValue(key: string) {
    const valueChanged =
      this.state.queuedChanges[key] !== null &&
      this.state.queuedChanges[key] !== undefined;
    return valueChanged
      ? this.state.queuedChanges[key]
      : this.props.threadInfo[key];
  }

  namePlaceholder() {
    return robotextName(
      this.props.threadInfo,
      this.props.viewerID,
      this.props.userInfos,
    );
  }

  changeQueued() {
    return (
      Object.keys(
        _pickBy(
          value => value !== null && value !== undefined,
          // the lodash/fp libdef coerces the returned object's properties to the
          // same type, which means it only works for object-as-maps $FlowFixMe
        )(this.state.queuedChanges),
      ).length > 0
    );
  }

  render() {
    const { threadInfo } = this.props;
    const inputDisabled =
      this.props.changeInProgress ||
      !this.hasPermissionForTab(threadInfo, this.state.currentTabType);

    let mainContent = null;
    if (this.state.currentTabType === 'general') {
      mainContent = (
        <div>
          <div>
            <div className={css.form_title}>Thread name</div>
            <div className={css.form_content}>
              <input
                type="text"
                value={firstLine(this.possiblyChangedValue('name'))}
                placeholder={this.namePlaceholder()}
                onChange={this.onChangeName}
                disabled={inputDisabled}
                ref={this.nameInputRef}
              />
            </div>
          </div>
          <div className={css.form_textarea_container}>
            <div className={css.form_title}>Description</div>
            <div className={css.form_content}>
              <textarea
                value={this.possiblyChangedValue('description')}
                placeholder="Thread description"
                onChange={this.onChangeDescription}
                disabled={inputDisabled}
              ></textarea>
            </div>
          </div>
          <div className={css.edit_thread_color_container}>
            <div className={`${css.form_title} ${css.color_title}`}>Color</div>
            <div className={css.form_content}>
              <ColorPicker
                id="edit-thread-color"
                value={this.possiblyChangedValue('color')}
                disabled={inputDisabled}
                onChange={this.onChangeColor}
              />
            </div>
          </div>
        </div>
      );
    } else if (this.state.currentTabType === 'privacy') {
      mainContent = (
        <div className={css.edit_thread_privacy_container}>
          <div className={css['modal-radio-selector']}>
            <div className={css.form_title}>Thread type</div>
            <div className={css.form_enum_selector}>
              <div className={css.form_enum_container}>
                <input
                  type="radio"
                  name="edit-thread-type"
                  id="edit-thread-open"
                  value={COMMUNITY_OPEN_SUBTHREAD}
                  checked={
                    this.possiblyChangedValue('type') ===
                    COMMUNITY_OPEN_SUBTHREAD
                  }
                  onChange={this.onChangeThreadType}
                  disabled={inputDisabled}
                />
                <div className={css.form_enum_option}>
                  <label htmlFor="edit-thread-open">
                    Open
                    <span className={css.form_enum_description}>
                      {threadTypeDescriptions[COMMUNITY_OPEN_SUBTHREAD]}
                    </span>
                  </label>
                </div>
              </div>
              <div className={css.form_enum_container}>
                <input
                  type="radio"
                  name="edit-thread-type"
                  id="edit-thread-closed"
                  value={COMMUNITY_SECRET_SUBTHREAD}
                  checked={
                    this.possiblyChangedValue('type') ===
                    COMMUNITY_SECRET_SUBTHREAD
                  }
                  onChange={this.onChangeThreadType}
                  disabled={inputDisabled}
                />
                <div className={css.form_enum_option}>
                  <label htmlFor="edit-thread-closed">
                    Secret
                    <span className={css.form_enum_description}>
                      {threadTypeDescriptions[COMMUNITY_SECRET_SUBTHREAD]}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (this.state.currentTabType === 'delete') {
      mainContent = (
        <>
          <div>
            <p className={css.italic}>
              Your thread will be permanently deleted. There is no way to
              reverse this.
            </p>
          </div>
          <div className={css.edit_thread_account_password}>
            <p className={css.confirm_account_password}>
              Please enter your account password to confirm your identity
            </p>
            <div className={css.form_title}>Account password</div>
            <div className={css.form_content}>
              <input
                type="password"
                placeholder="Personal account password"
                value={this.state.accountPassword}
                onChange={this.onChangeAccountPassword}
                disabled={inputDisabled}
                ref={this.accountPasswordInputRef}
              />
            </div>
          </div>
        </>
      );
    }

    let buttons = null;
    if (this.state.currentTabType === 'delete') {
      buttons = (
        <Button
          onClick={this.onDelete}
          variant="danger"
          disabled={inputDisabled}
        >
          Delete
        </Button>
      );
    } else {
      buttons = (
        <Button
          type="submit"
          onClick={this.onSubmit}
          disabled={inputDisabled || !this.changeQueued()}
        >
          Save
        </Button>
      );
    }

    const tabs = [
      <Tab
        name="General"
        tabType="general"
        onClick={this.setTab}
        selected={this.state.currentTabType === 'general'}
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
          onClick={this.setTab}
          selected={this.state.currentTabType === 'privacy'}
          key="privacy"
        />,
      );
    }
    const canDeleteThread = this.hasPermissionForTab(threadInfo, 'delete');
    if (canDeleteThread) {
      tabs.push(
        <Tab
          name="Delete"
          tabType="delete"
          onClick={this.setTab}
          selected={this.state.currentTabType === 'delete'}
          key="delete"
        />,
      );
    }

    return (
      <Modal name="Thread settings" onClose={this.props.onClose} size="large">
        <ul className={css.tab_panel}>{tabs}</ul>
        <div className={css.modal_body}>
          <form method="POST">
            {mainContent}
            <div className={css.form_footer}>
              {buttons}
              <div className={css.modal_form_error}>
                {this.state.errorMessage}
              </div>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  setTab = (tabType: TabType) => {
    this.setState({ currentTabType: tabType });
  };

  nameInputRef = (nameInput: ?HTMLInputElement) => {
    this.nameInput = nameInput;
  };

  newThreadPasswordInputRef = (newThreadPasswordInput: ?HTMLInputElement) => {
    this.newThreadPasswordInput = newThreadPasswordInput;
  };

  accountPasswordInputRef = (accountPasswordInput: ?HTMLInputElement) => {
    this.accountPasswordInput = accountPasswordInput;
  };

  onChangeName = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    const newValue =
      target.value !== this.props.threadInfo.name ? target.value : undefined;
    this.setState((prevState: State) => ({
      ...prevState,
      queuedChanges: {
        ...prevState.queuedChanges,
        name: firstLine(newValue),
      },
    }));
  };

  onChangeDescription = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    const newValue =
      target.value !== this.props.threadInfo.description
        ? target.value
        : undefined;
    this.setState((prevState: State) => ({
      ...prevState,
      queuedChanges: {
        ...prevState.queuedChanges,
        description: newValue,
      },
    }));
  };

  onChangeColor = (color: string) => {
    const newValue = color !== this.props.threadInfo.color ? color : undefined;
    this.setState((prevState: State) => ({
      ...prevState,
      queuedChanges: {
        ...prevState.queuedChanges,
        color: newValue,
      },
    }));
  };

  onChangeThreadType = (event: SyntheticEvent<HTMLInputElement>) => {
    const uiValue = assertThreadType(parseInt(event.currentTarget.value, 10));
    const newValue =
      uiValue !== this.props.threadInfo.type ? uiValue : undefined;
    this.setState((prevState: State) => ({
      ...prevState,
      queuedChanges: {
        ...prevState.queuedChanges,
        type: newValue,
      },
    }));
  };

  onChangeAccountPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    this.setState({ accountPassword: target.value });
  };

  onSubmit = (event: SyntheticEvent<HTMLElement>) => {
    event.preventDefault();
    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.changeThreadSettingsAction(),
    );
  };

  async changeThreadSettingsAction() {
    try {
      const response = await this.props.changeThreadSettings({
        threadID: this.props.threadInfo.id,
        changes: this.state.queuedChanges,
      });
      this.props.onClose();
      return response;
    } catch (e) {
      this.setState(
        prevState => ({
          ...prevState,
          queuedChanges: Object.freeze({}),
          accountPassword: '',
          errorMessage: 'unknown error',
          currentTabType: 'general',
        }),
        () => {
          invariant(this.nameInput, 'nameInput ref unset');
          this.nameInput.focus();
        },
      );
      throw e;
    }
  }

  onDelete = (event: SyntheticEvent<HTMLElement>) => {
    event.preventDefault();
    this.props.dispatchActionPromise(
      deleteThreadActionTypes,
      this.deleteThreadAction(),
    );
  };

  async deleteThreadAction() {
    try {
      const response = await this.props.deleteThread(
        this.props.threadInfo.id,
        this.state.accountPassword,
      );
      this.props.onClose();
      return response;
    } catch (e) {
      const errorMessage =
        e.message === 'invalid_credentials'
          ? 'wrong password'
          : 'unknown error';
      this.setState(
        {
          accountPassword: '',
          errorMessage: errorMessage,
        },
        () => {
          invariant(
            this.accountPasswordInput,
            'accountPasswordInput ref unset',
          );
          this.accountPasswordInput.focus();
        },
      );
      throw e;
    }
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

    if (!threadInfo) {
      return (
        <Modal onClose={modalContext.clearModal} name="Invalid thread">
          <div className={css.modal_body}>
            <p>You no longer have permission to view this thread</p>
          </div>
        </Modal>
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
        onClose={modalContext.clearModal}
      />
    );
  },
);

export default ConnectedThreadSettingsModal;
