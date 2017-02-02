// @flow

import type { AppState, UpdateStore } from 'lib/model/redux-reducer';
import type { VisibilityRules } from 'lib/model/calendar-info';
import {
  visibilityRules,
  assertVisibilityRules,
} from 'lib/model/calendar-info';

import React from 'react';
import invariant from 'invariant';
import { connect } from 'react-redux';
import update from 'immutability-helper';

import fetchJSON from 'lib/utils/fetch-json';
import { mapStateToUpdateStore } from 'lib/shared/redux-utils';

import css from '../style.css';
import Modal from './modal.react';
import ColorPicker from './color-picker.react';

type Props = {
  onClose: () => void,
  updateStore: UpdateStore,
};
type State = {
  name: string,
  description: string,
  color: string,
  visibilityRules: ?VisibilityRules,
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
      color: "fff8dd",
      visibilityRules: undefined,
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
    if (
      this.state.visibilityRules !== undefined &&
      this.state.visibilityRules !== null &&
      this.state.visibilityRules >= visibilityRules.CLOSED
    ) {
      calendarPasswordInputs = (
        <div>
          <div className={css['form-enum-password']}>
            <input
              type="password"
              placeholder="New calendar password"
              value={this.state.calendarPassword}
              onChange={this.onChangeCalendarPassword.bind(this)}
              disabled={this.state.inputDisabled}
              ref={(input) => this.calendarPasswordInput = input}
            />
          </div>
          <div className={css['form-enum-password']}>
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
    const closedPasswordEntry =
      this.state.visibilityRules === visibilityRules.CLOSED
        ? calendarPasswordInputs
        : null;
    const secretPasswordEntry =
      this.state.visibilityRules === visibilityRules.SECRET
        ? calendarPasswordInputs
        : null;
    return (
      <Modal name="New calendar" onClose={this.props.onClose} size="large">
        <div className={css['modal-body']}>
          <form method="POST">
            <div>
              <div className={css['form-title']}>Calendar name</div>
              <div className={css['form-content']}>
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
            <div className={css['form-textarea-container']}>
              <div className={css['form-title']}>Description</div>
              <div className={css['form-content']}>
                <textarea
                  value={this.state.description}
                  placeholder="Calendar description"
                  onChange={this.onChangeDescription.bind(this)}
                  disabled={this.state.inputDisabled}
                />
              </div>
            </div>
            <div className={css['new-calendar-privacy-container']}>
              <div className={css['modal-radio-selector']}>
                <div className={css['form-title']}>Visibility</div>
                <div className={css['form-enum-selector']}>
                  <div className={css['form-enum-container']}>
                    <input
                      type="radio"
                      name="new-calendar-type"
                      id="new-calendar-open"
                      value={visibilityRules.OPEN}
                      checked={
                        this.state.visibilityRules === visibilityRules.OPEN
                      }
                      onChange={this.onChangeClosed.bind(this)}
                      disabled={this.state.inputDisabled}
                      ref={(input) => this.openPrivacyInput = input}
                    />
                    <div className={css['form-enum-option']}>
                      <label htmlFor="new-calendar-open">
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
                      name="new-calendar-type"
                      id="new-calendar-closed"
                      value={visibilityRules.CLOSED}
                      checked={
                        this.state.visibilityRules === visibilityRules.CLOSED
                      }
                      onChange={this.onChangeClosed.bind(this)}
                      disabled={this.state.inputDisabled}
                    />
                    <div className={css['form-enum-option']}>
                      <label htmlFor="new-calendar-closed">
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
                      name="new-calendar-type"
                      id="new-calendar-secret"
                      value={visibilityRules.SECRET}
                      checked={
                        this.state.visibilityRules === visibilityRules.SECRET
                      }
                      onChange={this.onChangeClosed.bind(this)}
                      disabled={this.state.inputDisabled}
                    />
                    <div className={css['form-enum-option']}>
                      <label htmlFor="new-calendar-secret">
                        Secret
                        <span className={css['form-enum-description']}>
                          Only people with the password can view the calendar,
                          and it won't appear in search results or
                          recommendations. Share the URL and password with your
                          friends to add them.
                        </span>
                      </label>
                      {secretPasswordEntry}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className={`${css['form-title']} ${css['color-title']}`}>
                Color
              </div>
              <div className={css['form-content']}>
                <ColorPicker
                  id="new-calendar-color"
                  value={this.state.color}
                  disabled={this.state.inputDisabled}
                  onChange={this.onChangeColor.bind(this)}
                />
              </div>
            </div>
            <div className={css['form-footer']}>
              <span className={css['modal-form-error']}>
                {this.state.errorMessage}
              </span>
              <span className={css['form-submit']}>
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
    this.setState({
      visibilityRules: assertVisibilityRules(parseInt(target.value)),
    });
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

    const ourVisibilityRules = this.state.visibilityRules;
    invariant(
      ourVisibilityRules !== null,
      "visibilityRules state should never be set to null",
    );
    if (ourVisibilityRules === undefined) {
      this.setState(
        {
          errorMessage: "visibility unspecified",
        },
        () => {
          invariant(this.openPrivacyInput, "openPrivacyInput ref unset");
          this.openPrivacyInput.focus();
        },
      );
      return;
    }

    if (ourVisibilityRules >= visibilityRules.CLOSED) {
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
    const color = this.state.color;
    const response = await fetchJSON('new_calendar.php', {
      'name': name,
      'description': description,
      'visibility_rules': ourVisibilityRules,
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
        canChangeSettings: true,
        visibilityRules: ourVisibilityRules,
        color: color,
        editRules: ourVisibilityRules >= visibilityRules.CLOSED ? 1 : 0,
      }};
      // The "newCalendarID" state is a bit of a hack. Basically, we can't
      // immediately navigate to the new calendar because we don't have it in
      // the Redux store until after the below callback is executed. But Redux
      // doesn't give us any way to execute something after updating the store;
      // we have to watch the store to catch changes. This component is about to
      // die, so instead of having it monitor for when the Redux store has the
      // new calendar, we (arbitrarily) let the App component do it. This is how
      // we communicate the new calendar ID to the App component.
      this.props.updateStore((prevState: AppState) => update(prevState, {
        calendarInfos: updateObj,
        newCalendarID: { $set: newCalendarID },
      }));
      return;
    }

    this.setState(
      {
        name: "",
        description: "",
        color: "",
        visibilityRules: undefined,
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

NewCalendarModal.propTypes = {
  onClose: React.PropTypes.func.isRequired,
  updateStore: React.PropTypes.func.isRequired,
}

export default connect(
  undefined,
  mapStateToUpdateStore,
)(NewCalendarModal);
