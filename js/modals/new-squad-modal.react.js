// @flow

import type { AppState, UpdateStore } from '../redux-reducer';

import React from 'react';
import invariant from 'invariant';
import { connect } from 'react-redux';
import update from 'immutability-helper';

import Modal from './modal.react';
import fetchJSON from '../fetch-json';
import ColorPicker from './color-picker.react';
import { mapStateToUpdateStore } from '../redux-utils'

type Props = {
  onClose: () => void,
  updateStore: UpdateStore,
};
type State = {
  name: string,
  description: string,
  color: string,
  closed: ?bool,
  squadPassword: string,
  confirmSquadPassword: string,
  inputDisabled: bool,
  errorMessage: string,
};

class NewSquadModal extends React.Component {

  props: Props;
  state: State;
  nameInput: ?HTMLInputElement;
  openPrivacyInput: ?HTMLInputElement;
  squadPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      name: "",
      description: "",
      color: "#fff8dd",
      closed: undefined,
      squadPassword: "",
      confirmSquadPassword: "",
      inputDisabled: false,
      errorMessage: "",
    };
  }

  componentDidMount() {
    invariant(this.nameInput, "nameInput ref unset");
    this.nameInput.focus();
  }

  render() {
    let squadPasswordInputs = null;
    if (this.state.closed) {
      squadPasswordInputs = (
        <div>
          <div className="form-enum-password">
            <input
              type="password"
              placeholder="New squad password"
              value={this.state.squadPassword}
              onChange={this.onChangeSquadPassword.bind(this)}
              disabled={this.state.inputDisabled}
              ref={(input) => this.squadPasswordInput = input}
            />
          </div>
          <div className="form-enum-password">
            <input
              type="password"
              placeholder="Confirm squad password"
              value={this.state.confirmSquadPassword}
              onChange={this.onChangeConfirmSquadPassword.bind(this)}
              disabled={this.state.inputDisabled}
            />
          </div>
        </div>
      );
    }
    return (
      <Modal name="New squad" onClose={this.props.onClose} size="large">
        <div className="modal-body">
          <form method="POST">
            <div>
              <div className="form-title">Squad name</div>
              <div className="form-content">
                <input
                  type="text"
                  value={this.state.name}
                  placeholder="Squad name"
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
                  value={this.state.description}
                  placeholder="Squad description"
                  onChange={this.onChangeDescription.bind(this)}
                  disabled={this.state.inputDisabled}
                />
              </div>
            </div>
            <div className="new-squad-privacy-container">
              <div className="modal-radio-selector">
                <div className="form-title">Privacy</div>
                <div className="form-enum-selector">
                  <div className="form-enum-container">
                    <input
                      type="radio"
                      name="new-squad-type"
                      id="new-squad-open"
                      value={false}
                      checked={this.state.closed === false}
                      onChange={this.onChangeClosed.bind(this)}
                      disabled={this.state.inputDisabled}
                      ref={(input) => this.openPrivacyInput = input}
                    />
                    <div className="form-enum-option">
                      <label htmlFor="new-squad-open">
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
                      name="new-squad-type"
                      id="new-squad-closed"
                      value={true}
                      checked={this.state.closed === true}
                      onChange={this.onChangeClosed.bind(this)}
                      disabled={this.state.inputDisabled}
                    />
                    <div className="form-enum-option">
                      <label htmlFor="new-squad-closed">
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
            <div>
              <div className="form-title color-title">Color</div>
              <div className="form-content">
                <ColorPicker
                  id="new-squad-color"
                  value={this.state.color}
                  disabled={this.state.inputDisabled}
                  onChange={this.onChangeColor.bind(this)}
                />
              </div>
            </div>
            <div className="form-footer">
              <span className="modal-form-error">
                {this.state.errorMessage}
              </span>
              <span className="form-submit">
                <input
                  type="submit"
                  value="Save"
                  onClick={this.onSubmit.bind(this)}
                  disabled={this.state.inputDisabled}
                />
              </span>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  onChangeName(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ name: target.value });
  }

  onChangeDescription(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLTextAreaElement, "target not textarea");
    this.setState({ description: target.value });
  }

  onChangeColor(color: string) {
    this.setState({ color: color });
  }

  onChangeClosed(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ closed: target.value === "true" });
  }

  onChangeSquadPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ squadPassword: target.value });
  }

  onChangeConfirmSquadPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ confirmSquadPassword: target.value });
  }

  async onSubmit(event: SyntheticEvent) {
    event.preventDefault();

    const name = this.state.name.trim();
    if (name === '') {
      this.setState(
        {
          name: "",
          errorMessage: "empty squad name",
        },
        () => {
          invariant(this.nameInput, "nameInput ref unset");
          this.nameInput.focus();
        },
      );
      return;
    }

    if (this.state.closed === undefined) {
      this.setState(
        {
          errorMessage: "squad privacy unspecified",
        },
        () => {
          invariant(this.openPrivacyInput, "openPrivacyInput ref unset");
          this.openPrivacyInput.focus();
        },
      );
      return;
    }

    if (this.state.closed) {
      if (this.state.squadPassword === '') {
        this.setState(
          {
            squadPassword: "",
            confirmSquadPassword: "",
            errorMessage: "empty password",
          },
          () => {
            invariant(
              this.squadPasswordInput,
              "squadPasswordInput ref unset",
            );
            this.squadPasswordInput.focus();
          },
        );
        return;
      }
      if (this.state.squadPassword !== this.state.confirmSquadPassword) {
        this.setState(
          {
            squadPassword: "",
            confirmSquadPassword: "",
            errorMessage: "passwords don't match",
          },
          () => {
            invariant(
              this.squadPasswordInput,
              "squadPasswordInput ref unset",
            );
            this.squadPasswordInput.focus();
          },
        );
        return;
      }
    }

    this.setState({ inputDisabled: true });
    const description = this.state.description;
    const closed = this.state.closed;
    const color = this.state.color;
    const response: {[key: string]: any} = await fetchJSON('new_squad.php', {
      'name': name,
      'description': description,
      'type': closed ? "closed" : "open",
      'password': this.state.squadPassword,
      'color': color,
    });
    const newSquadID = response.new_squad_id.toString();
    if (response.success) {
      this.props.onClose();
      const updateObj = {};
      updateObj[newSquadID] = { $set: {
        id: newSquadID,
        name: name,
        description: description,
        authorized: true,
        subscribed: true,
        editable: true,
        closed: closed,
        color: color,
      }};
      this.props.updateStore((prevState: AppState) => update(prevState, {
        squadInfos: updateObj,
        newSquadID: { $set: newSquadID },
      }));
      return;
    }

    if (response.error === 'name_taken') {
      this.setState(
        {
          name: "",
          inputDisabled: false,
          errorMessage: "squad name already taken",
        },
        () => {
          invariant(this.nameInput, "nameInput ref unset");
          this.nameInput.focus();
        },
      );
    } else {
      this.setState(
        {
          name: "",
          description: "",
          color: "",
          closed: undefined,
          squadPassword: "",
          confirmSquadPassword: "",
          inputDisabled: false,
          errorMessage: "unknown error",
        },
        () => {
          invariant(this.nameInput, "nameInput ref unset");
          this.nameInput.focus();
        },
      );
    }
  }

}

NewSquadModal.propTypes = {
  onClose: React.PropTypes.func.isRequired,
  updateStore: React.PropTypes.func.isRequired,
}

export default connect(
  undefined,
  mapStateToUpdateStore,
)(NewSquadModal);
