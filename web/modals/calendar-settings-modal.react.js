// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import {
  calendarInfoPropType,
  visibilityRules,
  editRules,
  assertVisibilityRules,
  assertEditRules,
} from 'lib/types/calendar-types';
import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import React from 'react';
import classNames from 'classnames';
import invariant from 'invariant';
import { connect } from 'react-redux';

import { includeDispatchActionProps } from 'lib/utils/action-utils';
import {
  deleteCalendarActionType,
  deleteCalendar,
  changeCalendarSettingsActionType,
  changeCalendarSettings,
} from 'lib/actions/calendar-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import css from '../style.css';
import Modal from './modal.react';
import ColorPicker from './color-picker.react';

type Tab = "general" | "privacy" | "delete";
type Props = {
  calendarInfo: CalendarInfo,
  onClose: () => void,
  inputDisabled: bool,
  dispatchActionPromise: DispatchActionPromise,
};
type State = {
  calendarInfo: CalendarInfo,
  errorMessage: string,
  newCalendarPassword: string,
  confirmCalendarPassword: string,
  accountPassword: string,
  currentTab: Tab,
};

class CalendarSettingsModal extends React.Component {

  props: Props;
  state: State;
  nameInput: ?HTMLInputElement;
  newCalendarPasswordInput: ?HTMLInputElement;
  accountPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      calendarInfo: props.calendarInfo,
      errorMessage: "",
      newCalendarPassword: "",
      confirmCalendarPassword: "",
      accountPassword: "",
      currentTab: "general",
    };
  }

  componentDidMount() {
    invariant(this.nameInput, "nameInput ref unset");
    this.nameInput.focus();
  }

  render() {
    let mainContent = null;
    if (this.state.currentTab === "general") {
      mainContent = (
        <div>
          <div>
            <div className={css['form-title']}>Calendar name</div>
            <div className={css['form-content']}>
              <input
                type="text"
                value={this.state.calendarInfo.name}
                onChange={this.onChangeName.bind(this)}
                disabled={this.props.inputDisabled}
                ref={(input) => this.nameInput = input}
              />
            </div>
          </div>
          <div className={css['form-textarea-container']}>
            <div className={css['form-title']}>Description</div>
            <div className={css['form-content']}>
              <textarea
                value={this.state.calendarInfo.description}
                placeholder="Calendar description"
                onChange={this.onChangeDescription.bind(this)}
                disabled={this.props.inputDisabled}
              ></textarea>
            </div>
          </div>
          <div className={css['edit-calendar-color-container']}>
            <div className={`${css['form-title']} ${css['color-title']}`}>
              Color
            </div>
            <div className={css['form-content']}>
              <ColorPicker
                id="edit-calendar-color"
                value={this.state.calendarInfo.color}
                disabled={this.props.inputDisabled}
                onChange={this.onChangeColor.bind(this)}
              />
            </div>
          </div>
        </div>
      );
    } else if (this.state.currentTab === "privacy") {
      let calendarPasswordInputs = null;
      if (this.state.calendarInfo.visibilityRules >= visibilityRules.CLOSED) {
        const currentlyClosed =
          this.props.calendarInfo.visibilityRules >= visibilityRules.CLOSED;
        // Note: these depend on props, not state
        const passwordPlaceholder = currentlyClosed
          ? "New calendar password (optional)"
          : "New calendar password";
        const confirmPlaceholder = currentlyClosed
          ? "Confirm calendar password (optional)"
          : "Confirm calendar password";
        calendarPasswordInputs = (
          <div>
            <div className={css['form-enum-password']}>
              <input
                type="password"
                placeholder={passwordPlaceholder}
                value={this.state.newCalendarPassword}
                onChange={this.onChangeNewCalendarPassword.bind(this)}
                disabled={this.props.inputDisabled}
                ref={(input) => this.newCalendarPasswordInput = input}
              />
            </div>
            <div className={css['form-enum-password']}>
              <input
                type="password"
                placeholder={confirmPlaceholder}
                value={this.state.confirmCalendarPassword}
                onChange={this.onChangeConfirmCalendarPassword.bind(this)}
                disabled={this.props.inputDisabled}
              />
            </div>
          </div>
        );
      }
      const closedPasswordEntry =
        this.state.calendarInfo.visibilityRules === visibilityRules.CLOSED
          ? calendarPasswordInputs
          : null;
      const secretPasswordEntry =
        this.state.calendarInfo.visibilityRules === visibilityRules.SECRET
          ? calendarPasswordInputs
          : null;
      mainContent = (
        <div className={css['edit-calendar-privacy-container']}>
          <div className={css['modal-radio-selector']}>
            <div className={css['form-title']}>Visibility</div>
            <div className={css['form-enum-selector']}>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="edit-calendar-type"
                  id="edit-calendar-open"
                  value={visibilityRules.OPEN}
                  checked={
                    this.state.calendarInfo.visibilityRules ===
                    visibilityRules.OPEN
                  }
                  onChange={this.onChangeClosed.bind(this)}
                  disabled={this.props.inputDisabled}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="edit-calendar-open">
                    Open
                    <span className={css['form-enum-description']}>
                      Anybody can view the contents of an open calendar.
                    </span>
                  </label>
                </div>
              </div>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="edit-calendar-type"
                  id="edit-calendar-closed"
                  value={visibilityRules.CLOSED}
                  checked={
                    this.state.calendarInfo.visibilityRules ===
                    visibilityRules.CLOSED
                  }
                  onChange={this.onChangeClosed.bind(this)}
                  disabled={this.props.inputDisabled}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="edit-calendar-closed">
                    Closed
                    <span className={css['form-enum-description']}>
                      Only people with the password can view the contents of
                      a closed calendar.
                    </span>
                  </label>
                  {closedPasswordEntry}
                </div>
              </div>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="edit-calendar-type"
                  id="edit-calendar-secret"
                  value={visibilityRules.SECRET}
                  checked={
                    this.state.calendarInfo.visibilityRules ===
                    visibilityRules.SECRET
                  }
                  onChange={this.onChangeClosed.bind(this)}
                  disabled={this.props.inputDisabled}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="edit-calendar-secret">
                    Secret
                    <span className={css['form-enum-description']}>
                      Only people with the password can view the calendar, and
                      it won't appear in search results or recommendations.
                      Share the URL and password with your friends to add them.
                    </span>
                  </label>
                  {secretPasswordEntry}
                </div>
              </div>
            </div>
          </div>
          <div className={css['modal-radio-selector']}>
            <div className={css['form-title']}>Who can edit?</div>
            <div className={css['form-enum-selector']}>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="edit-calendar-edit-rules"
                  id="edit-calendar-edit-rules-anybody"
                  value={0}
                  checked={this.state.calendarInfo.editRules === 0}
                  onChange={this.onChangeEditRules.bind(this)}
                  disabled={this.props.inputDisabled}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="edit-calendar-edit-rules-anybody">
                    Anybody
                    <span className={css['form-enum-description']}>
                      Anybody who can view the contents of the calendar can also
                      edit them.
                    </span>
                  </label>
                </div>
              </div>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="edit-calendar-edit-rules"
                  id="edit-calendar-edit-rules-logged-in"
                  value={1}
                  checked={this.state.calendarInfo.editRules === 1}
                  onChange={this.onChangeEditRules.bind(this)}
                  disabled={this.props.inputDisabled}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="edit-calendar-edit-rules-logged-in">
                    Logged In
                    <span className={css['form-enum-description']}>
                      Only users who are logged in can edit the contents of the
                      calendar.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (this.state.currentTab === "delete") {
      mainContent = (
        <div>
          <p className={css['italic']}>
            Your calendar will be permanently deleted. There is no way to
            reverse this.
          </p>
        </div>
      );
    }

    let buttons = null;
    if (this.state.currentTab === "delete") {
      buttons = (
        <span className={css['form-submit']}>
          <input
            type="submit"
            value="Delete"
            onClick={this.onDelete.bind(this)}
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
            onClick={this.onSubmit.bind(this)}
            disabled={this.props.inputDisabled}
          />
        </span>
      );
    }

    return (
      <Modal name="Calendar settings" onClose={this.props.onClose} size="large">
        <ul className={css['tab-panel']}>
          {this.buildTab("general", "General")}
          {this.buildTab("privacy", "Privacy")}
          {this.buildTab("delete", "Delete")}
        </ul>
        <div className={css['modal-body']}>
          <form method="POST">
            {mainContent}
            <div className={css['edit-calendar-account-password']}>
              <p className={css['confirm-account-password']}>
                Please enter your account password to confirm your identity
              </p>
              <div className={css['form-title']}>Account password</div>
              <div className={css['form-content']}>
                <input
                  type="password"
                  placeholder="Personal account password"
                  value={this.state.accountPassword}
                  onChange={this.onChangeAccountPassword.bind(this)}
                  disabled={this.props.inputDisabled}
                  ref={(input) => this.accountPasswordInput = input}
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

  buildTab(tab: Tab, name: string) {
    const currentTab = this.state.currentTab;
    const classNamesForTab = classNames({
      [css['current-tab']]: currentTab === tab,
      [css['delete-tab']]: currentTab === tab && tab === "delete",
    });
    return (
      <li
        className={classNamesForTab}
        onClick={(e) => this.setState({ "currentTab": tab })}
      >
        <a>{name}</a>
      </li>
    );
  }

  onChangeName(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState((prevState: State, props) => ({
      ...prevState,
      calendarInfo: {
        ...prevState.calendarInfo,
        name: target.value,
      },
    }));
  }

  onChangeDescription(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLTextAreaElement, "target not textarea");
    this.setState((prevState, props) => ({
      ...prevState,
      calendarInfo: {
        ...prevState.calendarInfo,
        description: target.value,
      },
    }));
  }

  onChangeColor(color: string) {
    this.setState((prevState, props) => ({
      ...prevState,
      calendarInfo: {
        ...prevState.calendarInfo,
        color,
      },
    }));
  }

  onChangeClosed(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState((prevState, props) => ({
      ...prevState,
      calendarInfo: {
        ...prevState.calendarInfo,
        visibilityRules: assertVisibilityRules(parseInt(target.value)),
      },
    }));
  }

  onChangeEditRules(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState((prevState, props) => ({
      ...prevState,
      calendarInfo: {
        ...prevState.calendarInfo,
        editRules: assertEditRules(parseInt(target.value)),
      },
    }));
  }

  onChangeNewCalendarPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ newCalendarPassword: target.value });
  }

  onChangeConfirmCalendarPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ confirmCalendarPassword: target.value });
  }

  onChangeAccountPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ accountPassword: target.value });
  }

  onSubmit(event: SyntheticEvent) {
    event.preventDefault();

    const name = this.state.calendarInfo.name.trim();
    if (name === '') {
      this.setState(
        (prevState, props) => ({
          ...prevState,
          calendarInfo: {
            ...prevState.calendarInfo,
            name: this.props.calendarInfo.name,
          },
          errorMessage: "empty calendar name",
          currentTab: "general",
        }),
        () => {
          invariant(this.nameInput, "nameInput ref unset");
          this.nameInput.focus();
        },
      );
      return;
    }

    if (this.state.calendarInfo.visibilityRules >= visibilityRules.CLOSED) {
      // If the calendar is currently open but is being switched to closed,
      // then a password *must* be specified
      if (
        this.props.calendarInfo.visibilityRules < visibilityRules.CLOSED &&
        this.state.newCalendarPassword.trim() === ''
      ) {
        this.setState(
          {
            newCalendarPassword: "",
            confirmCalendarPassword: "",
            errorMessage: "empty password",
            currentTab: "privacy",
          },
          () => {
            invariant(
              this.newCalendarPasswordInput,
              "newCalendarPasswordInput ref unset",
            );
            this.newCalendarPasswordInput.focus();
          },
        );
        return;
      }
      if (
        this.state.newCalendarPassword !== this.state.confirmCalendarPassword
      ) {
        this.setState(
          {
            newCalendarPassword: "",
            confirmCalendarPassword: "",
            errorMessage: "passwords don't match",
            currentTab: "privacy",
          },
          () => {
            invariant(
              this.newCalendarPasswordInput,
              "newCalendarPasswordInput ref unset",
            );
            this.newCalendarPasswordInput.focus();
          },
        );
        return;
      }
    }

    this.props.dispatchActionPromise(
      changeCalendarSettingsActionType,
      this.changeCalendarSettingsAction(name),
    );
  }

  async changeCalendarSettingsAction(name: string) {
    try {
      const newCalendarInfo: CalendarInfo = {
        ...this.state.calendarInfo,
        name,
      };
      const response = await changeCalendarSettings(
        this.state.accountPassword,
        this.state.newCalendarPassword,
        newCalendarInfo,
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
            calendarInfo: {
              ...prevState.calendarInfo,
              name: this.props.calendarInfo.name,
              description: this.props.calendarInfo.description,
              visibilityRules: this.props.calendarInfo.visibilityRules,
              color: this.props.calendarInfo.color,
              editRules: this.props.calendarInfo.editRules,
            },
            newCalendarPassword: { $set: "" },
            confirmCalendarPassword: { $set: "" },
            accountPassword: { $set: "" },
            errorMessage: { $set: "unknown error" },
            currentTab: { $set: "general" },
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

  onDelete(event: SyntheticEvent) {
    event.preventDefault();
    this.props.dispatchActionPromise(
      deleteCalendarActionType,
      this.deleteCalendarAction(),
    );
  }

  async deleteCalendarAction() {
    try {
      const response = await deleteCalendar(
        this.props.calendarInfo.id,
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

CalendarSettingsModal.propTypes = {
  calendarInfo: calendarInfoPropType.isRequired,
  onClose: React.PropTypes.func.isRequired,
  inputDisabled: React.PropTypes.bool.isRequired,
  dispatchActionPromise: React.PropTypes.func.isRequired,
}

const deleteCalendarLoadingStatusSelector
  = createLoadingStatusSelector(deleteCalendarActionType);
const changeCalendarSettingsLoadingStatusSelector
  = createLoadingStatusSelector(changeCalendarSettingsActionType);

export default connect(
  (state: AppState) => ({
    inputDisabled: deleteCalendarLoadingStatusSelector(state) === "loading" ||
      changeCalendarSettingsLoadingStatusSelector(state) === "loading",
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
)(CalendarSettingsModal);
