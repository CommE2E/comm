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
  calendarPassword: string,
  confirmCalendarPassword: string,
  inputDisabled: bool,
  errorMessage: string,
};

class NewCalendarModal extends React.Component {

  props: Props;
  state: State;
  nameInput: ?HTMLInputElement;
  openPrivacyInput: ?HTMLInputElement;
  calendarPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      name: "",
      description: "",
      color: "#fff8dd",
      closed: undefined,
      calendarPassword: "",
      confirmCalendarPassword: "",
      inputDisabled: false,
      errorMessage: "",
    };
  }

  componentDidMount() {
    invariant(this.nameInput, "nameInput ref unset");
    this.nameInput.focus();
  }

  render() {
    let calendarPasswordInputs = null;
    if (this.state.closed) {
      calendarPasswordInputs = (
        <div>
          <div className="form-enum-password">
            <input
              type="password"
              placeholder="New calendar password"
              value={this.state.calendarPassword}
              onChange={this.onChangeCalendarPassword.bind(this)}
              disabled={this.state.inputDisabled}
              ref={(input) => this.calendarPasswordInput = input}
            />
          </div>
          <div className="form-enum-password">
            <input
              type="password"
              placeholder="Confirm calendar password"
              value={this.state.confirmCalendarPassword}
              onChange={this.onChangeConfirmCalendarPassword.bind(this)}
              disabled={this.state.inputDisabled}
            />
          </div>
        </div>
      );
    }
    return (
      <Modal name="New calendar" onClose={this.props.onClose} size="large">
        <div className="modal-body">
          <form method="POST">
            <div>
              <div className="form-title">Calendar name</div>
              <div className="form-content">
                <input
                  type="text"
                  value={this.state.name}
                  placeholder="Calendar name"
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
                  placeholder="Calendar description"
                  onChange={this.onChangeDescription.bind(this)}
                  disabled={this.state.inputDisabled}
                />
              </div>
            </div>
            <div className="new-calendar-privacy-container">
              <div className="modal-radio-selector">
                <div className="form-title">Privacy</div>
                <div className="form-enum-selector">
                  <div className="form-enum-container">
                    <input
                      type="radio"
                      name="new-calendar-type"
                      id="new-calendar-open"
                      value={false}
                      checked={this.state.closed === false}
                      onChange={this.onChangeClosed.bind(this)}
                      disabled={this.state.inputDisabled}
                      ref={(input) => this.openPrivacyInput = input}
                    />
                    <div className="form-enum-option">
                      <label htmlFor="new-calendar-open">
                        Open
                        <span className="form-enum-description">
                          Anybody can view the contents of an open calendar.
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="form-enum-container">
                    <input
                      type="radio"
                      name="new-calendar-type"
                      id="new-calendar-closed"
                      value={true}
                      checked={this.state.closed === true}
                      onChange={this.onChangeClosed.bind(this)}
                      disabled={this.state.inputDisabled}
                    />
                    <div className="form-enum-option">
                      <label htmlFor="new-calendar-closed">
                        Closed
                        <span className="form-enum-description">
                          Only people with the password can view the contents of
                          a closed calendar.
                        </span>
                      </label>
                      {calendarPasswordInputs}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="form-title color-title">Color</div>
              <div className="form-content">
                <ColorPicker
                  id="new-calendar-color"
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

  onChangeCalendarPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ calendarPassword: target.value });
  }

  onChangeConfirmCalendarPassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ confirmCalendarPassword: target.value });
  }

  async onSubmit(event: SyntheticEvent) {
    event.preventDefault();

    const name = this.state.name.trim();
    if (name === '') {
      this.setState(
        {
          name: "",
          errorMessage: "empty calendar name",
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
          errorMessage: "privacy unspecified",
        },
        () => {
          invariant(this.openPrivacyInput, "openPrivacyInput ref unset");
          this.openPrivacyInput.focus();
        },
      );
      return;
    }

    if (this.state.closed) {
      if (this.state.calendarPassword === '') {
        this.setState(
          {
            calendarPassword: "",
            confirmCalendarPassword: "",
            errorMessage: "empty password",
          },
          () => {
            invariant(
              this.calendarPasswordInput,
              "calendarPasswordInput ref unset",
            );
            this.calendarPasswordInput.focus();
          },
        );
        return;
      }
      if (this.state.calendarPassword !== this.state.confirmCalendarPassword) {
        this.setState(
          {
            calendarPassword: "",
            confirmCalendarPassword: "",
            errorMessage: "passwords don't match",
          },
          () => {
            invariant(
              this.calendarPasswordInput,
              "calendarPasswordInput ref unset",
            );
            this.calendarPasswordInput.focus();
          },
        );
        return;
      }
    }

    this.setState({ inputDisabled: true });
    const description = this.state.description;
    const closed = this.state.closed;
    const color = this.state.color;
    const response = await fetchJSON('new_calendar.php', {
      'name': name,
      'description': description,
      'type': closed ? "closed" : "open",
      'password': this.state.calendarPassword,
      'color': color,
    });
    if (response.success) {
      const newCalendarID = response.new_calendar_id.toString();
      this.props.onClose();
      const updateObj = {};
      updateObj[newCalendarID] = { $set: {
        id: newCalendarID,
        name: name,
        description: description,
        authorized: true,
        subscribed: true,
        editable: true,
        closed: closed,
        color: color,
      }};
      this.props.updateStore((prevState: AppState) => update(prevState, {
        calendarInfos: updateObj,
        newCalendarID: { $set: newCalendarID },
      }));
      return;
    }

    if (response.error === 'name_taken') {
      this.setState(
        {
          name: "",
          inputDisabled: false,
          errorMessage: "calendar name already taken",
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
          calendarPassword: "",
          confirmCalendarPassword: "",
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

NewCalendarModal.propTypes = {
  onClose: React.PropTypes.func.isRequired,
  updateStore: React.PropTypes.func.isRequired,
}

export default connect(
  undefined,
  mapStateToUpdateStore,
)(NewCalendarModal);
