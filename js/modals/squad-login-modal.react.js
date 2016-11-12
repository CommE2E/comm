// @flow

import type { SquadInfo } from '../squad-info';
import { squadInfoPropType } from '../squad-info';

import React from 'react';
import invariant from 'invariant';
import { connect } from 'react-redux';

import Modal from './modal.react';
import fetchJSON from '../fetch-json';
import LogInModal from './account/log-in-modal.react';
import { mapStateToPropsByName } from '../redux-utils';

type Props = {
  squadInfo: SquadInfo,
  thisURL: string,
  monthURL: string,
  loggedIn: bool,
  setModal: (modal: React.Element<any>) => void,
  onClose: () => void,
};
type State = {
  password: string,
  inputDisabled: bool,
  errorMessage: string,
};

class SquadLoginModal extends React.Component {

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
              <div className="form-float-title">Squad</div>
              <div className="form-float-content">
                {this.props.squadInfo.name}
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
      'squad': this.props.squadInfo.id,
      'password': this.state.password,
    });
    if (response.success) {
      window.location.href = this.props.monthURL
        + "&squad=" + this.props.squadInfo.id;
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
    this.props.setModal(
      <LogInModal
        thisURL={this.props.thisURL}
        onClose={this.props.onClose}
        setModal={this.props.setModal}
      />
    );
  }

}

SquadLoginModal.propTypes = {
  squadInfo: squadInfoPropType.isRequired,
  thisURL: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  setModal: React.PropTypes.func.isRequired,
  onClose: React.PropTypes.func.isRequired,
};

const mapStateToProps = mapStateToPropsByName([
  "thisURL",
  "monthURL",
  "loggedIn",
]);
export default connect(mapStateToProps)(SquadLoginModal);
