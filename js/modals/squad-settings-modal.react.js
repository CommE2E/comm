// @flow

import type { CalendarInfo } from '../calendar-info';
import { calendarInfoPropType } from '../calendar-info';
import type { AppState, UpdateStore } from '../redux-reducer';

import React from 'react';
import classNames from 'classnames';
import invariant from 'invariant';
import update from 'immutability-helper';
import { connect } from 'react-redux';
import _ from 'lodash';

import Modal from './modal.react';
import fetchJSON from '../fetch-json';
import ColorPicker from './color-picker.react';
import { monthURL } from '../nav-utils';
import { mapStateToUpdateStore } from '../redux-utils';
import history from '../router-history';

type Tab = "general" | "privacy" | "delete";
type Props = {
  calendarInfo: CalendarInfo,
  monthURL: string,
  navSquadID: ?string,
  navHome: bool,
  calendarInfos: {[id: string]: CalendarInfo},
  updateStore: UpdateStore,
  onClose: () => void,
};
type State = {
  calendarInfo: CalendarInfo,
  inputDisabled: bool,
  errorMessage: string,
  newSquadPassword: string,
  confirmSquadPassword: string,
  accountPassword: string,
  currentTab: Tab,
};

class SquadSettingsModal extends React.Component {

  props: Props;
  state: State;
  nameInput: ?HTMLInputElement;
  newSquadPasswordInput: ?HTMLInputElement;
  accountPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      calendarInfo: props.calendarInfo,
      inputDisabled: false,
      errorMessage: "",
      newSquadPassword: "",
      confirmSquadPassword: "",
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
            <div className="form-title">Squad name</div>
            <div className="form-content">
              <input
                type="text"
                value={this.state.calendarInfo.name}
                onChange={this.onChangeName.bind(this)}
                disabled={this.state.inputDisabled}
                ref={(input) => this.nameInput = input}
              />
            </div>
          </div>
          <div className="form-textarea-container">
            <div className="form-title">Description</div>
            <div className="form-content">
              <textarea
                value={this.state.calendarInfo.description}
                placeholder="Squad description"
                onChange={this.onChangeDescription.bind(this)}
                disabled={this.state.inputDisabled}
              ></textarea>
            </div>
          </div>
          <div className="edit-calendar-color-container">
            <div className="form-title color-title">Color</div>
            <div className="form-content">
              <ColorPicker
                id="edit-squad-color"
                value={this.state.calendarInfo.color}
                disabled={this.state.inputDisabled}
                onChange={this.onChangeColor.bind(this)}
              />
            </div>
          </div>
        </div>
      );
    } else if (this.state.currentTab === "privacy") {
      let squadPasswordInputs = null;
      if (this.state.calendarInfo.closed) {
        // Note: these depend on props, not state
        const passwordPlaceholder = this.props.calendarInfo.closed
          ? "New squad password (optional)"
          : "New squad password";
        const confirmPlaceholder = this.props.calendarInfo.closed
          ? "Confirm squad password (optional)"
          : "Confirm squad password";
        squadPasswordInputs = (
          <div>
            <div className="form-enum-password">
              <input
                type="password"
                placeholder={passwordPlaceholder}
                value={this.state.newSquadPassword}
                onChange={this.onChangeNewSquadPassword.bind(this)}
                disabled={this.state.inputDisabled}
                ref={(input) => this.newSquadPasswordInput = input}
              />
            </div>
            <div className="form-enum-password">
              <input
                type="password"
                placeholder={confirmPlaceholder}
                value={this.state.confirmSquadPassword}
                onChange={this.onChangeConfirmSquadPassword.bind(this)}
                disabled={this.state.inputDisabled}
              />
            </div>
          </div>
        );
      }
      mainContent = (
        <div className="edit-calendar-privacy-container">
          <div className="modal-radio-selector">
            <div className="form-title">Privacy</div>
            <div className="form-enum-selector">
              <div className="form-enum-container">
                <input
                  type="radio"
                  name="edit-squad-type"
                  id="edit-squad-open"
                  value={false}
                  checked={!this.state.calendarInfo.closed}
                  onChange={this.onChangeClosed.bind(this)}
                  disabled={this.state.inputDisabled}
                />
                <div className="form-enum-option">
                  <label htmlFor="edit-squad-open">
                    Open
                    <span className="form-enum-description">
                      Anybody can view the contents of an open squad.
                    </span>
                  </label>
                </div>
              </div>
              <div className="form-enum-container">
                <input
                  type="radio"
                  name="edit-squad-type"
                  id="edit-squad-closed"
                  value={true}
                  checked={this.state.calendarInfo.closed}
                  onChange={this.onChangeClosed.bind(this)}
                  disabled={this.state.inputDisabled}
                />
                <div className="form-enum-option">
                  <label htmlFor="edit-squad-closed">
                    Closed
                    <span className="form-enum-description">
                      Only people with the password can view the contents of
                      a closed squad.
                    </span>
                  </label>
                  {squadPasswordInputs}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (this.state.currentTab === "delete") {
      mainContent = (
        <div>
          <p className="italic">
            Your squad will be permanently deleted. There is no way to reverse
            this.
          </p>
        </div>
      );
    }

    let buttons = null;
    if (this.state.currentTab === "delete") {
      buttons = (
        <span className="form-submit">
          <input
            type="submit"
            value="Delete"
            onClick={this.onDelete.bind(this)}
            disabled={this.state.inputDisabled}
          />
        </span>
      );
    } else {
      buttons = (
        <span className="form-submit">
          <input
            type="submit"
            value="Save"
            onClick={this.onSubmit.bind(this)}
            disabled={this.state.inputDisabled}
          />
        </span>
      );
    }

    return (
      <Modal name="Squad settings" onClose={this.props.onClose} size="large">
        <ul className="tab-panel">
          {this.buildTab("general", "General")}
          {this.buildTab("privacy", "Privacy")}
          {this.buildTab("delete", "Delete")}
        </ul>
        <div className="modal-body">
          <form method="POST">
            {mainContent}
            <div className="edit-calendar-account-password">
              <p className="confirm-account-password">
                Please enter your account password to confirm your identity
              </p>
              <div className="form-title">Account password</div>
              <div className="form-content">
                <input
                  type="password"
                  placeholder="Personal account password"
                  value={this.state.accountPassword}
                  onChange={this.onChangeAccountPassword.bind(this)}
                  disabled={this.state.inputDisabled}
                  ref={(input) => this.accountPasswordInput = input}
                />
              </div>
            </div>
            <div className="form-footer">
              <span className="modal-form-error">
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
      'current-tab': currentTab === tab,
      'delete-tab': currentTab === tab && tab === "delete",
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
    this.setState((prevState, props) => {
      return update(prevState, {
        calendarInfo: { name: { $set: target.value } },
      });
    });
  }

  onChangeDescription(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLTextAreaElement, "target not textarea");
    this.setState((prevState, props) => {
      return update(prevState, {
        calendarInfo: { description: { $set: target.value } },
      });
    });
  }

  onChangeColor(color: string) {
    this.setState((prevState, props) => {
      return update(prevState, {
        calendarInfo: { color: { $set: color } },
      });
    });
  }

  onChangeClosed(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState((prevState, props) => {
      return update(prevState, {
        calendarInfo: { closed: { $set: target.value === "true" } },
      });
    });
  }

  onChangeNewSquadPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ newSquadPassword: target.value });
  }

  onChangeConfirmSquadPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ confirmSquadPassword: target.value });
  }

  onChangeAccountPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ accountPassword: target.value });
  }

  async onSubmit(event: SyntheticEvent) {
    event.preventDefault();

    const name = this.state.calendarInfo.name.trim();
    if (name === '') {
      this.setState(
        (prevState, props) => {
          return update(prevState, {
            calendarInfo: { name: { $set: this.props.calendarInfo.name } },
            errorMessage: { $set: "empty squad name" },
            currentTab: { $set: "general" },
          });
        },
        () => {
          invariant(this.nameInput, "nameInput ref unset");
          this.nameInput.focus();
        },
      );
      return;
    }

    if (this.state.calendarInfo.closed) {
      // If the squad is currently open but is being switched to closed,
      // then a password *must* be specified
      if (
        !this.props.calendarInfo.closed && this.state.newSquadPassword === ''
      ) {
        this.setState(
          {
            newSquadPassword: "",
            confirmSquadPassword: "",
            errorMessage: "empty password",
            currentTab: "privacy",
          },
          () => {
            invariant(
              this.newSquadPasswordInput,
              "newSquadPasswordInput ref unset",
            );
            this.newSquadPasswordInput.focus();
          },
        );
        return;
      }
      if (this.state.newSquadPassword !== this.state.confirmSquadPassword) {
        this.setState(
          {
            newSquadPassword: "",
            confirmSquadPassword: "",
            errorMessage: "passwords don't match",
            currentTab: "privacy",
          },
          () => {
            invariant(
              this.newSquadPasswordInput,
              "newSquadPasswordInput ref unset",
            );
            this.newSquadPasswordInput.focus();
          },
        );
        return;
      }
    }

    this.setState({ inputDisabled: true });
    const response = await fetchJSON('edit_squad.php', {
      'name': name,
      'description': this.state.calendarInfo.description,
      'squad': this.props.calendarInfo.id,
      'type': this.state.calendarInfo.closed ? "closed" : "open",
      'personal_password': this.state.accountPassword,
      'new_password': this.state.newSquadPassword,
      'color': this.state.calendarInfo.color,
    });
    if (response.success) {
      this.props.updateStore((prevState: AppState) => {
        const calendarInfo = update(
          this.state.calendarInfo,
          { name: { $set: name } },
        );
        const updateObj = {};
        updateObj[this.props.calendarInfo.id] = { $set: calendarInfo };
        return update(prevState, { calendarInfos: updateObj });
      });
      this.props.onClose();
      return;
    }

    if (response.error === 'invalid_credentials') {
      this.setState(
        {
          accountPassword: "",
          errorMessage: "wrong password",
          inputDisabled: false,
        },
        () => {
          invariant(
            this.accountPasswordInput,
            "accountPasswordInput ref unset",
          );
          this.accountPasswordInput.focus();
        },
      );
    } else if (response.error === 'name_taken') {
      this.setState(
        (prevState, props) => {
          return update(prevState, {
            calendarInfo: { name: { $set: this.props.calendarInfo.name } },
            errorMessage: { $set: "squad name already taken" },
            inputDisabled: { $set: false },
            currentTab: { $set: "general" },
          });
        },
        () => {
          invariant(this.nameInput, "nameInput ref unset");
          this.nameInput.focus();
        },
      );
    } else {
      this.setState(
        (prevState, props) => {
          return update(prevState, {
            calendarInfo: {
              name: { $set: this.props.calendarInfo.name },
              description: { $set: this.props.calendarInfo.description },
              closed: { $set: this.props.calendarInfo.closed },
              color: { $set: this.props.calendarInfo.color },
            },
            newSquadPassword: { $set: "" },
            confirmSquadPassword: { $set: "" },
            accountPassword: { $set: "" },
            errorMessage: { $set: "unknown error" },
            inputDisabled: { $set: false },
            currentTab: { $set: "general" },
          });
        },
        () => {
          invariant(this.nameInput, "nameInput ref unset");
          this.nameInput.focus();
        },
      );
    }
  }

  async onDelete(event: SyntheticEvent) {
    event.preventDefault();

    this.setState({ inputDisabled: true });
    const response = await fetchJSON('delete_squad.php', {
      'squad': this.props.calendarInfo.id,
      'password': this.state.accountPassword,
    });
    if (response.success) {
      this.props.updateStore((prevState: AppState) => {
        const newCalendarInfos = _.omitBy(
          prevState.calendarInfos,
          (candidate) => candidate.id === this.props.calendarInfo.id,
        );
        return update(prevState, { calendarInfos: { $set: newCalendarInfos } });
      });
      if (this.props.navHome && !this.otherSubscriptionExists()) {
        // TODO fix this special case of default squad 254
        history.replace(`squad/254/${this.props.monthURL}`);
      } else if (this.props.navSquadID === this.props.calendarInfo.id) {
        if (this.otherSubscriptionExists()) {
          history.replace(`home/${this.props.monthURL}`);
        } else {
          // TODO fix this special case of default squad 254
          history.replace(`squad/254/${this.props.monthURL}`);
        }
      }
      this.props.onClose();
      return;
    }

    const errorMessage = response.error === "invalid_credentials"
      ? "wrong password"
      : "unknown error";
    this.setState(
      {
        accountPassword: "",
        errorMessage: errorMessage,
        inputDisabled: false,
      },
      () => {
        invariant(this.accountPasswordInput, "accountPasswordInput ref unset");
        this.accountPasswordInput.focus();
      },
    );
  }

  otherSubscriptionExists() {
    return _.some(
      this.props.calendarInfos,
      (calendarInfo: CalendarInfo) => calendarInfo.subscribed &&
        calendarInfo.id !== this.props.calendarInfo.id,
    );
  }

}

SquadSettingsModal.propTypes = {
  calendarInfo: calendarInfoPropType.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  navSquadID: React.PropTypes.string,
  navHome: React.PropTypes.bool.isRequired,
  calendarInfos: React.PropTypes.objectOf(calendarInfoPropType).isRequired,
  updateStore: React.PropTypes.func.isRequired,
  onClose: React.PropTypes.func.isRequired,
}

export default connect(
  (state: AppState) => ({
    monthURL: monthURL(state),
    navSquadID: state.navInfo.squadID,
    navHome: state.navInfo.home,
    calendarInfos: state.calendarInfos,
  }),
  mapStateToUpdateStore,
)(SquadSettingsModal);
