// @flow

import type { SquadInfo } from '../squad-info';
import { squadInfoPropType } from '../squad-info';

import React from 'react';
import classNames from 'classnames';
import invariant from 'invariant';
import update from 'immutability-helper';
import { connect } from 'react-redux';

import Modal from './modal.react';
import fetchJSON from '../fetch-json';
import ColorPicker from './color-picker.react';
import { mapStateToPropsByName } from '../redux-utils';

type Tab = "general" | "privacy" | "delete";
type Props = {
  squadInfo: SquadInfo,
  baseURL: string,
  thisURL: string,
  monthURL: string,
  onClose: () => void,
};
type State = {
  squadInfo: SquadInfo,
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
      squadInfo: props.squadInfo,
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
                value={this.state.squadInfo.name}
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
                value={this.state.squadInfo.description}
                placeholder="Squad description"
                onChange={this.onChangeDescription.bind(this)}
                disabled={this.state.inputDisabled}
              ></textarea>
            </div>
          </div>
          <div className="edit-squad-color-container">
            <div className="form-title color-title">Color</div>
            <div className="form-content">
              <ColorPicker
                id="edit-squad-color"
                value={this.state.squadInfo.color}
                disabled={this.state.inputDisabled}
                onChange={this.onChangeColor.bind(this)}
              />
            </div>
          </div>
        </div>
      );
    } else if (this.state.currentTab === "privacy") {
      let squadPasswordInputs = null;
      if (this.state.squadInfo.closed) {
        // Note: these depend on props, not state
        const passwordPlaceholder = this.props.squadInfo.closed
          ? "New squad password (optional)"
          : "New squad password";
        const confirmPlaceholder = this.props.squadInfo.closed
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
        <div className="edit-squad-privacy-container">
          <div className="modal-radio-selector">
            <div className="form-title">Privacy</div>
            <div className="form-enum-selector">
              <div className="form-enum-container">
                <input
                  type="radio"
                  name="edit-squad-type"
                  id="edit-squad-open"
                  value={false}
                  checked={!this.state.squadInfo.closed}
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
                  checked={this.state.squadInfo.closed}
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
            <div className="edit-squad-account-password">
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
        <a href="#">{name}</a>
      </li>
    );
  }

  onChangeName(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState((prevState, props) => {
      return update(prevState, {
        squadInfo: {
          name: { $set: target.value },
        }
      });
    });
  }

  onChangeDescription(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLTextAreaElement, "target not textarea");
    this.setState((prevState, props) => {
      return update(prevState, {
        squadInfo: {
          description: { $set: target.value },
        }
      });
    });
  }

  onChangeColor(color: string) {
    this.setState((prevState, props) => {
      return update(prevState, {
        squadInfo: {
          color: { $set: color },
        }
      });
    });
  }

  onChangeClosed(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState((prevState, props) => {
      return update(prevState, {
        squadInfo: {
          closed: { $set: target.value === "true" },
        }
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

    const name = this.state.squadInfo.name.trim();
    if (name === '') {
      this.setState(
        (prevState, props) => {
          return update(prevState, {
            squadInfo: {
              name: { $set: this.props.squadInfo.name },
            },
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

    if (this.state.squadInfo.closed) {
      // If the squad is currently open but is being switched to closed,
      // then a password *must* be specified
      if (!this.props.squadInfo.closed && this.state.newSquadPassword === '') {
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
    const response = await fetchJSON(this.props.baseURL, 'edit_squad.php', {
      'name': name,
      'description': this.state.squadInfo.description,
      'squad': this.props.squadInfo.id,
      'type': this.state.squadInfo.closed ? "closed" : "open",
      'personal_password': this.state.accountPassword,
      'new_password': this.state.newSquadPassword,
      'color': this.state.squadInfo.color,
    });
    if (response.success) {
      window.location.href = this.props.thisURL;
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
            squadInfo: {
              name: { $set: this.props.squadInfo.name },
            },
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
            squadInfo: {
              name: { $set: this.props.squadInfo.name },
              description: { $set: this.props.squadInfo.description },
              closed: { $set: this.props.squadInfo.closed },
              color: { $set: this.props.squadInfo.color },
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
    const response = await fetchJSON(this.props.baseURL, 'delete_squad.php', {
      'squad': this.props.squadInfo.id,
      'password': this.state.accountPassword,
    });
    if (response.success) {
      window.location.href = this.props.monthURL;
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

}

SquadSettingsModal.propTypes = {
  squadInfo: squadInfoPropType.isRequired,
  baseURL: React.PropTypes.string.isRequired,
  thisURL: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  onClose: React.PropTypes.func.isRequired,
}

const mapStateToProps = mapStateToPropsByName([
  "baseURL",
  "thisURL",
  "monthURL",
]);
export default connect(mapStateToProps)(SquadSettingsModal);
