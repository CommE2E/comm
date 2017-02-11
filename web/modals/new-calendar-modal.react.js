// @flow

import type { VisibilityRules } from 'lib/types/calendar-types';
import {
  visibilityRules,
  assertVisibilityRules,
} from 'lib/types/calendar-types';
import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import React from 'react';
import invariant from 'invariant';
import { connect } from 'react-redux';

import { includeDispatchActionProps } from 'lib/utils/action-utils';
import {
  newCalendarActionType,
  newCalendar,
} from 'lib/actions/calendar-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import css from '../style.css';
import Modal from './modal.react';
import ColorPicker from './color-picker.react';

type Props = {
  onClose: () => void,
  inputDisabled: bool,
  dispatchActionPromise: DispatchActionPromise,
};
type State = {
  name: string,
  description: string,
  color: string,
  visibilityRules: ?VisibilityRules,
  calendarPassword: string,
  confirmCalendarPassword: string,
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
              disabled={this.props.inputDisabled}
              ref={(input) => this.calendarPasswordInput = input}
            />
          </div>
          <div className={css['form-enum-password']}>
            <input
              type="password"
              placeholder="Confirm calendar password"
              value={this.state.confirmCalendarPassword}
              onChange={this.onChangeConfirmCalendarPassword.bind(this)}
              disabled={this.props.inputDisabled}
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
                  disabled={this.props.inputDisabled}
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
                  disabled={this.props.inputDisabled}
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
                      disabled={this.props.inputDisabled}
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
                      disabled={this.props.inputDisabled}
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
                      disabled={this.props.inputDisabled}
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
                  disabled={this.props.inputDisabled}
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
                  disabled={this.props.inputDisabled}
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

  onSubmit(event: SyntheticEvent) {
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

    this.props.dispatchActionPromise(
      newCalendarActionType,
      this.newCalendarAction(name, ourVisibilityRules),
    );
  }

  async newCalendarAction(name: string, ourVisibilityRules: VisibilityRules) {
    try {
      const response = await newCalendar(
        name,
        this.state.description,
        ourVisibilityRules,
        this.state.calendarPassword,
        this.state.color,
      );
      this.props.onClose();
      return response;
    } catch (e) {
      this.setState(
        {
          name: "",
          description: "",
          color: "",
          visibilityRules: undefined,
          calendarPassword: "",
          confirmCalendarPassword: "",
          errorMessage: "unknown error",
        },
        () => {
          invariant(this.nameInput, "nameInput ref unset");
          this.nameInput.focus();
        },
      );
      throw e;
    }
  }

}

NewCalendarModal.propTypes = {
  onClose: React.PropTypes.func.isRequired,
  inputDisabled: React.PropTypes.bool.isRequired,
  dispatchActionPromise: React.PropTypes.func.isRequired,
}

const loadingStatusSelector
  = createLoadingStatusSelector(newCalendarActionType);

export default connect(
  (state: AppState) => ({
    inputDisabled: loadingStatusSelector(state) === "loading",
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
)(NewCalendarModal);
