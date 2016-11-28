// @flow

import type { CalendarInfo } from '../calendar-info';
import { calendarInfoPropType } from '../calendar-info';
import type { AppState, UpdateStore } from '../redux-reducer';

import React from 'react';
import invariant from 'invariant';
import { connect } from 'react-redux';
import update from 'immutability-helper';

import Modal from './modal.react';
import fetchJSON from '../fetch-json';
import LogInModal from './account/log-in-modal.react';
import { monthURL, fetchEntriesAndUpdateStore } from '../nav-utils';
import { mapStateToUpdateStore } from '../redux-utils'
import history from '../router-history';

type Props = {
  calendarInfo: CalendarInfo,
  monthURL: string,
  loggedIn: bool,
  year: number,
  month: number,
  setModal: (modal: React.Element<any>) => void,
  onClose: () => void,
  updateStore: UpdateStore,
};
type State = {
  password: string,
  inputDisabled: bool,
  errorMessage: string,
};

class CalendarLoginModal extends React.Component {

  props: Props;
  state: State;
  passwordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      password: "",
      inputDisabled: false,
      errorMessage: "",
    };
  }

  componentDidMount() {
    invariant(this.passwordInput, "passwordInput ref unset");
    this.passwordInput.focus();
  }

  render() {
    let loginMessage = null;
    if (!this.props.loggedIn) {
      loginMessage = (
        <p className="form-pre-footer">
          Or{' '}
          <a
            href="#"
            onClick={this.onClickAccountLogin.bind(this)}
          >log in</a>
          {' '}to your account if you already have access
        </p>
      );
    }
    return (
      <Modal name="Password required" onClose={this.props.onClose}>
        <div className="modal-body">
          <form method="POST">
            <div className="form-text">
              <div className="form-float-title">Calendar</div>
              <div className="form-float-content">
                {this.props.calendarInfo.name}
              </div>
            </div>
            <div className="clear">
              <div className="form-title">Password</div>
              <div className="form-content">
                <input
                  type="password"
                  placeholder="Password"
                  value={this.state.password}
                  onChange={this.onChangePassword.bind(this)}
                  disabled={this.state.inputDisabled}
                  ref={(input) => this.passwordInput = input}
                />
              </div>
            </div>
            {loginMessage}
            <div className="form-footer">
              <span className="modal-form-error">
                {this.state.errorMessage}
              </span>
              <span className="form-submit">
                <input
                  type="submit"
                  value="Submit"
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

  onChangePassword(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ password: target.value });
  }

  async onSubmit(event: SyntheticEvent) {
    event.preventDefault();

    this.setState({ inputDisabled: true });
    const response = await fetchJSON('auth_squad.php', {
      'squad': this.props.calendarInfo.id,
      'password': this.state.password,
    });
    if (response.success) {
      this.props.updateStore((prevState: AppState) => {
        const updateObj = {};
        updateObj[this.props.calendarInfo.id] = {
          authorized: { $set: true },
        };
        return update(prevState, {
          calendarInfos: updateObj,
        });
      });
      this.props.onClose();
      history.push(
        `squad/${this.props.calendarInfo.id}/${this.props.monthURL}`,
      );
      await fetchEntriesAndUpdateStore(
        this.props.year,
        this.props.month,
        this.props.calendarInfo.id,
        this.props.updateStore,
      );
      return;
    }

    const errorMessage = response.error === "invalid_credentials"
      ? "wrong password"
      : "unknown error";
    this.setState(
      {
        password: "",
        errorMessage: errorMessage,
        inputDisabled: false,
      },
      () => {
        invariant(this.passwordInput, "passwordInput ref unset");
        this.passwordInput.focus();
      },
    );
  }

  onClickAccountLogin(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <LogInModal
        onClose={this.props.onClose}
        setModal={this.props.setModal}
      />
    );
  }

}

CalendarLoginModal.propTypes = {
  calendarInfo: calendarInfoPropType.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  setModal: React.PropTypes.func.isRequired,
  onClose: React.PropTypes.func.isRequired,
  updateStore: React.PropTypes.func.isRequired,
};

export default connect(
  (state: AppState) => ({
    monthURL: monthURL(state),
    loggedIn: state.loggedIn,
    year: state.navInfo.year,
    month: state.navInfo.month,
  }),
  mapStateToUpdateStore,
)(CalendarLoginModal);
