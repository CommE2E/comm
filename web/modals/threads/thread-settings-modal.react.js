// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import _pickBy from 'lodash/fp/pickBy';
import PropTypes from 'prop-types';
import * as React from 'react';

import {
  deleteThreadActionTypes,
  deleteThread,
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  threadHasPermission,
  threadTypeDescriptions,
  robotextName,
} from 'lib/shared/thread-utils';
import {
  type ThreadInfo,
  threadInfoPropType,
  threadTypes,
  assertThreadType,
  type ChangeThreadSettingsPayload,
  type UpdateThreadRequest,
  type LeaveThreadPayload,
  threadPermissions,
  type ThreadChanges,
} from 'lib/types/thread-types';
import { type UserInfos, userInfoPropType } from 'lib/types/user-types';
import {
  useDispatchActionPromise,
  useServerCall,
  type DispatchActionPromise,
} from 'lib/utils/action-utils';
import { firstLine } from 'lib/utils/string-utils';

import { useSelector } from '../../redux/redux-utils';
import css from '../../style.css';
import Modal from '../modal.react';
import ColorPicker from './color-picker.react';

type TabType = 'general' | 'privacy' | 'delete';
type TabProps = {
  name: string,
  tabType: TabType,
  selected: boolean,
  onClick: (tabType: TabType) => void,
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

type BaseProps = {|
  +threadInfo: ThreadInfo,
  +onClose: () => void,
|};
type Props = {|
  ...BaseProps,
  +inputDisabled: boolean,
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
|};
type State = {|
  queuedChanges: ThreadChanges,
  errorMessage: string,
  accountPassword: string,
  currentTabType: TabType,
|};
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
          (value) => value !== null && value !== undefined,
          // the lodash/fp libdef coerces the returned object's properties to the
          // same type, which means it only works for object-as-maps $FlowFixMe
        )(this.state.queuedChanges),
      ).length > 0
    );
  }

  render() {
    let mainContent = null;
    if (this.state.currentTabType === 'general') {
      mainContent = (
        <div>
          <div>
            <div className={css['form-title']}>Thread name</div>
            <div className={css['form-content']}>
              <input
                type="text"
                value={firstLine(this.possiblyChangedValue('name'))}
                placeholder={this.namePlaceholder()}
                onChange={this.onChangeName}
                disabled={this.props.inputDisabled}
                ref={this.nameInputRef}
              />
            </div>
          </div>
          <div className={css['form-textarea-container']}>
            <div className={css['form-title']}>Description</div>
            <div className={css['form-content']}>
              <textarea
                value={this.possiblyChangedValue('description')}
                placeholder="Thread description"
                onChange={this.onChangeDescription}
                disabled={this.props.inputDisabled}
              ></textarea>
            </div>
          </div>
          <div className={css['edit-thread-color-container']}>
            <div className={`${css['form-title']} ${css['color-title']}`}>
              Color
            </div>
            <div className={css['form-content']}>
              <ColorPicker
                id="edit-thread-color"
                value={this.possiblyChangedValue('color')}
                disabled={this.props.inputDisabled}
                onChange={this.onChangeColor}
              />
            </div>
          </div>
        </div>
      );
    } else if (this.state.currentTabType === 'privacy') {
      mainContent = (
        <div className={css['edit-thread-privacy-container']}>
          <div className={css['modal-radio-selector']}>
            <div className={css['form-title']}>Thread type</div>
            <div className={css['form-enum-selector']}>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="edit-thread-type"
                  id="edit-thread-open"
                  value={threadTypes.CHAT_NESTED_OPEN}
                  checked={
                    this.possiblyChangedValue('type') ===
                    threadTypes.CHAT_NESTED_OPEN
                  }
                  onChange={this.onChangeThreadType}
                  disabled={this.props.inputDisabled}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="edit-thread-open">
                    Open
                    <span className={css['form-enum-description']}>
                      {threadTypeDescriptions[threadTypes.CHAT_NESTED_OPEN]}
                    </span>
                  </label>
                </div>
              </div>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="edit-thread-type"
                  id="edit-thread-closed"
                  value={threadTypes.CHAT_SECRET}
                  checked={
                    this.possiblyChangedValue('type') ===
                    threadTypes.CHAT_SECRET
                  }
                  onChange={this.onChangeThreadType}
                  disabled={this.props.inputDisabled}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="edit-thread-closed">
                    Secret
                    <span className={css['form-enum-description']}>
                      {threadTypeDescriptions[threadTypes.CHAT_SECRET]}
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
            <p className={css['italic']}>
              Your thread will be permanently deleted. There is no way to
              reverse this.
            </p>
          </div>
          <div className={css['edit-thread-account-password']}>
            <p className={css['confirm-account-password']}>
              Please enter your account password to confirm your identity
            </p>
            <div className={css['form-title']}>Account password</div>
            <div className={css['form-content']}>
              <input
                type="password"
                placeholder="Personal account password"
                value={this.state.accountPassword}
                onChange={this.onChangeAccountPassword}
                disabled={this.props.inputDisabled}
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
        <input
          type="submit"
          value="Delete"
          onClick={this.onDelete}
          disabled={this.props.inputDisabled}
        />
      );
    } else {
      buttons = (
        <input
          type="submit"
          value="Save"
          onClick={this.onSubmit}
          disabled={this.props.inputDisabled || !this.changeQueued()}
        />
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
    if (this.possiblyChangedValue('parentThreadID')) {
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
    const canDeleteThread = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.DELETE_THREAD,
    );
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
        <ul className={css['tab-panel']}>{tabs}</ul>
        <div className={css['modal-body']}>
          <form method="POST">
            {mainContent}
            <div className={css['form-footer']}>
              {buttons}
              <div className={css['modal-form-error']}>
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

  onSubmit = (event: SyntheticEvent<HTMLInputElement>) => {
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
        (prevState) => ({
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

  onDelete = (event: SyntheticEvent<HTMLInputElement>) => {
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

ThreadSettingsModal.propTypes = {
  threadInfo: threadInfoPropType.isRequired,
  onClose: PropTypes.func.isRequired,
  inputDisabled: PropTypes.bool.isRequired,
  viewerID: PropTypes.string,
  userInfos: PropTypes.objectOf(userInfoPropType).isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  deleteThread: PropTypes.func.isRequired,
  changeThreadSettings: PropTypes.func.isRequired,
};

const deleteThreadLoadingStatusSelector = createLoadingStatusSelector(
  deleteThreadActionTypes,
);
const changeThreadSettingsLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
);

export default React.memo<BaseProps>(function ConnectedThreadSettingsModal(
  props: BaseProps,
) {
  const inputDisabled = useSelector(
    (state) =>
      deleteThreadLoadingStatusSelector(state) === 'loading' ||
      changeThreadSettingsLoadingStatusSelector(state) === 'loading',
  );
  const viewerID = useSelector(
    (state) => state.currentUserInfo && state.currentUserInfo.id,
  );
  const userInfos = useSelector((state) => state.userStore.userInfos);
  const callDeleteThread = useServerCall(deleteThread);
  const callChangeThreadSettings = useServerCall(changeThreadSettings);
  const dispatchActionPromise = useDispatchActionPromise();

  return (
    <ThreadSettingsModal
      {...props}
      inputDisabled={inputDisabled}
      viewerID={viewerID}
      userInfos={userInfos}
      deleteThread={callDeleteThread}
      changeThreadSettings={callChangeThreadSettings}
      dispatchActionPromise={dispatchActionPromise}
    />
  );
});
