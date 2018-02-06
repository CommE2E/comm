// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import {
  threadInfoPropType,
  visibilityRules,
  assertVisibilityRules,
} from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import * as React from 'react';
import classNames from 'classnames';
import invariant from 'invariant';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  deleteThreadActionTypes,
  deleteThread,
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import css from '../../style.css';
import Modal from '../modal.react';
import ColorPicker from './color-picker.react';

type TabType = "general" | "privacy" | "delete";
type TabProps = {
  name: string,
  tabType: TabType,
  selected: bool,
  onClick: (tabType: TabType) => void,
};
class Tab extends React.PureComponent<TabProps> {

  render() {
    const classNamesForTab = classNames({
      [css['current-tab']]: this.props.selected,
      [css['delete-tab']]: this.props.selected &&
        this.props.tabType === "delete",
    });
    return (
      <li className={classNamesForTab} onClick={this.onClick}>
        <a>{this.props.name}</a>
      </li>
    );
  }

  onClick = () => {
    return this.props.onClick(this.props.tabType);
  }

}

type Props = {
  threadInfo: ThreadInfo,
  onClose: () => void,
  // Redux state
  inputDisabled: bool,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  deleteThread:
    (threadID: string, currentAccountPassword: string) => Promise<Object>,
  changeThreadSettings: (
    currentAccountPassword: string,
    newThreadInfo: ThreadInfo,
    newThreadPassword: ?string,
  ) => Promise<Object>,
};
type State = {
  threadInfo: ThreadInfo,
  errorMessage: string,
  newThreadPassword: string,
  confirmThreadPassword: string,
  accountPassword: string,
  currentTabType: TabType,
};

class ThreadSettingsModal extends React.PureComponent<Props, State> {

  nameInput: ?HTMLInputElement;
  newThreadPasswordInput: ?HTMLInputElement;
  accountPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      threadInfo: props.threadInfo,
      errorMessage: "",
      newThreadPassword: "",
      confirmThreadPassword: "",
      accountPassword: "",
      currentTabType: "general",
    };
  }

  componentDidMount() {
    invariant(this.nameInput, "nameInput ref unset");
    this.nameInput.focus();
  }

  threadName() {
    return this.state.threadInfo.name
      ? this.state.threadInfo.name
      : "";
  }

  render() {
    let mainContent = null;
    if (this.state.currentTabType === "general") {
      mainContent = (
        <div>
          <div>
            <div className={css['form-title']}>Thread name</div>
            <div className={css['form-content']}>
              <input
                type="text"
                value={this.threadName()}
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
                value={this.state.threadInfo.description}
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
                value={this.state.threadInfo.color}
                disabled={this.props.inputDisabled}
                onChange={this.onChangeColor}
              />
            </div>
          </div>
        </div>
      );
    } else if (this.state.currentTabType === "privacy") {
      let threadPasswordInputs = null;
      if (this.state.threadInfo.visibilityRules >= visibilityRules.CLOSED) {
        const currentlyClosed =
          this.props.threadInfo.visibilityRules >= visibilityRules.CLOSED;
        // Note: these depend on props, not state
        const passwordPlaceholder = currentlyClosed
          ? "New thread password (optional)"
          : "New thread password";
        const confirmPlaceholder = currentlyClosed
          ? "Confirm thread password (optional)"
          : "Confirm thread password";
        threadPasswordInputs = (
          <div>
            <div className={css['form-enum-password']}>
              <input
                type="password"
                placeholder={passwordPlaceholder}
                value={this.state.newThreadPassword}
                onChange={this.onChangeNewThreadPassword}
                disabled={this.props.inputDisabled}
                ref={this.newThreadPasswordInputRef}
              />
            </div>
            <div className={css['form-enum-password']}>
              <input
                type="password"
                placeholder={confirmPlaceholder}
                value={this.state.confirmThreadPassword}
                onChange={this.onChangeConfirmThreadPassword}
                disabled={this.props.inputDisabled}
              />
            </div>
          </div>
        );
      }
      const closedPasswordEntry =
        this.state.threadInfo.visibilityRules === visibilityRules.CLOSED
          ? threadPasswordInputs
          : null;
      const secretPasswordEntry =
        this.state.threadInfo.visibilityRules === visibilityRules.SECRET
          ? threadPasswordInputs
          : null;
      mainContent = (
        <div className={css['edit-thread-privacy-container']}>
          <div className={css['modal-radio-selector']}>
            <div className={css['form-title']}>Visibility</div>
            <div className={css['form-enum-selector']}>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="edit-thread-type"
                  id="edit-thread-open"
                  value={visibilityRules.OPEN}
                  checked={
                    this.state.threadInfo.visibilityRules ===
                    visibilityRules.OPEN
                  }
                  onChange={this.onChangeClosed}
                  disabled={this.props.inputDisabled}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="edit-thread-open">
                    Open
                    <span className={css['form-enum-description']}>
                      Anybody can view the contents of an open thread.
                    </span>
                  </label>
                </div>
              </div>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="edit-thread-type"
                  id="edit-thread-closed"
                  value={visibilityRules.CLOSED}
                  checked={
                    this.state.threadInfo.visibilityRules ===
                    visibilityRules.CLOSED
                  }
                  onChange={this.onChangeClosed}
                  disabled={this.props.inputDisabled}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="edit-thread-closed">
                    Closed
                    <span className={css['form-enum-description']}>
                      Only people with the password can view the contents of
                      a closed thread.
                    </span>
                  </label>
                  {closedPasswordEntry}
                </div>
              </div>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="edit-thread-type"
                  id="edit-thread-secret"
                  value={visibilityRules.SECRET}
                  checked={
                    this.state.threadInfo.visibilityRules ===
                    visibilityRules.SECRET
                  }
                  onChange={this.onChangeClosed}
                  disabled={this.props.inputDisabled}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="edit-thread-secret">
                    Secret
                    <span className={css['form-enum-description']}>
                      Only people with the password can view the thread, and
                      it won't appear in search results or recommendations.
                      Share the URL and password with your friends to add them.
                    </span>
                  </label>
                  {secretPasswordEntry}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (this.state.currentTabType === "delete") {
      mainContent = (
        <div>
          <p className={css['italic']}>
            Your thread will be permanently deleted. There is no way to
            reverse this.
          </p>
        </div>
      );
    }

    let buttons = null;
    if (this.state.currentTabType === "delete") {
      buttons = (
        <span className={css['form-submit']}>
          <input
            type="submit"
            value="Delete"
            onClick={this.onDelete}
            disabled={this.props.inputDisabled}
          />
        </span>
      );
    } else {
      buttons = (
        <span className={css['form-submit']}>
          <input
            type="submit"
            value="Save"
            onClick={this.onSubmit}
            disabled={this.props.inputDisabled}
          />
        </span>
      );
    }

    return (
      <Modal name="Thread settings" onClose={this.props.onClose} size="large">
        <ul className={css['tab-panel']}>
          <Tab
            name="General"
            tabType="general"
            onClick={this.setTab}
            selected={this.state.currentTabType === "general"}
            key="general"
          />
          <Tab
            name="Privacy"
            tabType="privacy"
            onClick={this.setTab}
            selected={this.state.currentTabType === "privacy"}
            key="privacy"
          />
          <Tab
            name="Delete"
            tabType="delete"
            onClick={this.setTab}
            selected={this.state.currentTabType === "delete"}
            key="delete"
          />
        </ul>
        <div className={css['modal-body']}>
          <form method="POST">
            {mainContent}
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
            <div className={css['form-footer']}>
              <span className={css['modal-form-error']}>
                {this.state.errorMessage}
              </span>
              {buttons}
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
  }

  newThreadPasswordInputRef = (
    newThreadPasswordInput: ?HTMLInputElement,
  ) => {
    this.newThreadPasswordInput = newThreadPasswordInput;
  }

  accountPasswordInputRef = (accountPasswordInput: ?HTMLInputElement) => {
    this.accountPasswordInput = accountPasswordInput;
  }

  onChangeName = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    this.setState((prevState: State, props) => ({
      ...prevState,
      threadInfo: {
        id: prevState.threadInfo.id,
        description: prevState.threadInfo.description,
        visibilityRules: prevState.threadInfo.visibilityRules,
        color: prevState.threadInfo.color,
        creationTime: prevState.threadInfo.creationTime,
        parentThreadID: prevState.threadInfo.parentThreadID,
        members: prevState.threadInfo.members,
        roles: prevState.threadInfo.roles,
        currentUser: prevState.threadInfo.currentUser,
        name: target.value,
        uiName: target.value,
      },
    }));
  }

  onChangeDescription = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    this.setState((prevState, props) => ({
      ...prevState,
      threadInfo: {
        id: prevState.threadInfo.id,
        name: prevState.threadInfo.name,
        uiName: prevState.threadInfo.uiName,
        visibilityRules: prevState.threadInfo.visibilityRules,
        color: prevState.threadInfo.color,
        creationTime: prevState.threadInfo.creationTime,
        parentThreadID: prevState.threadInfo.parentThreadID,
        members: prevState.threadInfo.members,
        roles: prevState.threadInfo.roles,
        currentUser: prevState.threadInfo.currentUser,
        description: target.value,
      },
    }));
  }

  onChangeColor = (color: string) => {
    this.setState((prevState, props) => ({
      ...prevState,
      threadInfo: {
        id: prevState.threadInfo.id,
        name: prevState.threadInfo.name,
        uiName: prevState.threadInfo.uiName,
        description: prevState.threadInfo.description,
        visibilityRules: prevState.threadInfo.visibilityRules,
        creationTime: prevState.threadInfo.creationTime,
        parentThreadID: prevState.threadInfo.parentThreadID,
        members: prevState.threadInfo.members,
        roles: prevState.threadInfo.roles,
        currentUser: prevState.threadInfo.currentUser,
        color,
      },
    }));
  }

  onChangeClosed = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    this.setState((prevState, props) => ({
      ...prevState,
      threadInfo: {
        id: prevState.threadInfo.id,
        name: prevState.threadInfo.name,
        uiName: prevState.threadInfo.uiName,
        description: prevState.threadInfo.description,
        color: prevState.threadInfo.color,
        creationTime: prevState.threadInfo.creationTime,
        parentThreadID: prevState.threadInfo.parentThreadID,
        members: prevState.threadInfo.members,
        roles: prevState.threadInfo.roles,
        currentUser: prevState.threadInfo.currentUser,
        visibilityRules: assertVisibilityRules(parseInt(target.value)),
      },
    }));
  }

  onChangeNewThreadPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    this.setState({ newThreadPassword: target.value });
  }

  onChangeConfirmThreadPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    this.setState({ confirmThreadPassword: target.value });
  }

  onChangeAccountPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    this.setState({ accountPassword: target.value });
  }

  onSubmit = (event: SyntheticEvent<HTMLInputElement>) => {
    event.preventDefault();

    const name = this.threadName().trim();
    if (name === '') {
      this.setState(
        (prevState, props) => ({
          ...prevState,
          threadInfo: {
            id: prevState.threadInfo.id,
            description: prevState.threadInfo.description,
            visibilityRules: prevState.threadInfo.visibilityRules,
            color: prevState.threadInfo.color,
            creationTime: prevState.threadInfo.creationTime,
            parentThreadID: prevState.threadInfo.parentThreadID,
            members: prevState.threadInfo.members,
            roles: prevState.threadInfo.roles,
            currentUser: prevState.threadInfo.currentUser,
            name: this.props.threadInfo.name,
            uiName: this.props.threadInfo.uiName,
          },
          errorMessage: "empty thread name",
          currentTabType: "general",
        }),
        () => {
          invariant(this.nameInput, "nameInput ref unset");
          this.nameInput.focus();
        },
      );
      return;
    }

    if (this.state.threadInfo.visibilityRules >= visibilityRules.CLOSED) {
      // If the thread is currently open but is being switched to closed,
      // then a password *must* be specified
      if (
        this.props.threadInfo.visibilityRules < visibilityRules.CLOSED &&
        this.state.newThreadPassword.trim() === ''
      ) {
        this.setState(
          {
            newThreadPassword: "",
            confirmThreadPassword: "",
            errorMessage: "empty password",
            currentTabType: "privacy",
          },
          () => {
            invariant(
              this.newThreadPasswordInput,
              "newThreadPasswordInput ref unset",
            );
            this.newThreadPasswordInput.focus();
          },
        );
        return;
      }
      if (
        this.state.newThreadPassword !== this.state.confirmThreadPassword
      ) {
        this.setState(
          {
            newThreadPassword: "",
            confirmThreadPassword: "",
            errorMessage: "passwords don't match",
            currentTabType: "privacy",
          },
          () => {
            invariant(
              this.newThreadPasswordInput,
              "newThreadPasswordInput ref unset",
            );
            this.newThreadPasswordInput.focus();
          },
        );
        return;
      }
    }

    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.changeThreadSettingsAction(name),
    );
  }

  async changeThreadSettingsAction(name: string) {
    try {
      const newThreadInfo: ThreadInfo = {
        id: this.state.threadInfo.id,
        name,
        uiName: name,
        description: this.state.threadInfo.description,
        visibilityRules: this.state.threadInfo.visibilityRules,
        color: this.state.threadInfo.color,
        creationTime: this.state.threadInfo.creationTime,
        parentThreadID: this.state.threadInfo.parentThreadID,
        members: this.state.threadInfo.members,
        roles: this.state.threadInfo.roles,
        currentUser: this.state.threadInfo.currentUser,
      };
      const newThreadPassword = this.state.newThreadPassword.trim() !== ''
        ? this.state.newThreadPassword
        : null;
      const response = await this.props.changeThreadSettings(
        this.state.accountPassword,
        newThreadInfo,
        newThreadPassword,
      );
      this.props.onClose();
      return response;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        this.setState(
          {
            accountPassword: "",
            errorMessage: "wrong password",
          },
          () => {
            invariant(
              this.accountPasswordInput,
              "accountPasswordInput ref unset",
            );
            this.accountPasswordInput.focus();
          },
        );
      } else {
        this.setState(
          (prevState, props) => ({
            ...prevState,
            threadInfo: {
              id: prevState.threadInfo.id,
              creationTime: prevState.threadInfo.creationTime,
              parentThreadID: prevState.threadInfo.parentThreadID,
              members: prevState.threadInfo.members,
              roles: prevState.threadInfo.roles,
              currentUser: prevState.threadInfo.currentUser,
              name: this.props.threadInfo.name,
              uiName: this.props.threadInfo.uiName,
              description: this.props.threadInfo.description,
              visibilityRules: this.props.threadInfo.visibilityRules,
              color: this.props.threadInfo.color,
            },
            newThreadPassword: "",
            confirmThreadPassword: "",
            accountPassword: "",
            errorMessage: "unknown error",
            currentTabType: "general",
          }),
          () => {
            invariant(this.nameInput, "nameInput ref unset");
            this.nameInput.focus();
          },
        );
      }
      throw e;
    }
  }

  onDelete = (event: SyntheticEvent<HTMLInputElement>) => {
    event.preventDefault();
    this.props.dispatchActionPromise(
      deleteThreadActionTypes,
      this.deleteThreadAction(),
    );
  }

  async deleteThreadAction() {
    try {
      const response = await this.props.deleteThread(
        this.props.threadInfo.id,
        this.state.accountPassword,
      );
      this.props.onClose();
      return response;
    } catch (e) {
      const errorMessage = e.message === "invalid_credentials"
        ? "wrong password"
        : "unknown error";
      this.setState(
        {
          accountPassword: "",
          errorMessage: errorMessage,
        },
        () => {
          invariant(
            this.accountPasswordInput,
            "accountPasswordInput ref unset",
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
  dispatchActionPromise: PropTypes.func.isRequired,
  deleteThread: PropTypes.func.isRequired,
  changeThreadSettings: PropTypes.func.isRequired,
}

const deleteThreadLoadingStatusSelector
  = createLoadingStatusSelector(deleteThreadActionTypes);
const changeThreadSettingsLoadingStatusSelector
  = createLoadingStatusSelector(changeThreadSettingsActionTypes);

export default connect(
  (state: AppState) => ({
    inputDisabled: deleteThreadLoadingStatusSelector(state) === "loading" ||
      changeThreadSettingsLoadingStatusSelector(state) === "loading",
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ deleteThread, changeThreadSettings }),
)(ThreadSettingsModal);
