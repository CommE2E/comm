// @flow

import type { AppState } from './redux-reducer';

import React from 'react';
import { connect } from 'react-redux';

import fetchJSON from './fetch-json';
import LogInModal from './modals/account/log-in-modal.react';
import RegisterModal from './modals/account/register-modal.react';
import UserSettingsModal from './modals/account/user-settings-modal.react.js';
import { monthURL } from './nav-utils';

type Props = {
  baseURL: string,
  monthURL: string,
  loggedIn: bool,
  username: string,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
};

class AccountBar extends React.Component {

  props: Props;

  render() {
    if (this.props.loggedIn) {
      return (
        <div className="nav-button">
          {"logged in as "}
          <span className="username">{this.props.username}</span>
          <div className="nav-menu">
            <div>
              <a
                href="#"
                onClick={this.onLogOut.bind(this)}
              >Log out</a>
            </div>
            <div>
              <a
                href="#"
                onClick={this.onEditAccount.bind(this)}
              >Edit account</a>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="nav-button">
          <a
            href="#"
            onClick={this.onLogIn.bind(this)}
          >Log in</a>
          {" · "}
          <a
            href="#"
            onClick={this.onRegister.bind(this)}
          >Register</a>
        </div>
      );
    }
  }

  async onLogOut(event: SyntheticEvent) {
    await fetchJSON(this.props.baseURL, 'logout.php', {});
    window.location.href = this.props.monthURL;
  }

  onEditAccount(event: SyntheticEvent) {
    this.props.setModal(
      <UserSettingsModal
        onClose={this.props.clearModal}
        setModal={this.props.setModal}
      />
    );
  }

  onLogIn(event: SyntheticEvent) {
    this.props.setModal(
      <LogInModal
        onClose={this.props.clearModal}
        setModal={this.props.setModal}
      />
    );
  }

  onRegister(event: SyntheticEvent) {
    this.props.setModal(
      <RegisterModal
        onClose={this.props.clearModal}
      />
    );
  }

}

AccountBar.propTypes = {
  baseURL: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  username: React.PropTypes.string.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
};

export default connect((state: AppState) => ({
  baseURL: state.navInfo.baseURL,
  monthURL: monthURL(state),
  loggedIn: state.loggedIn,
  username: state.username,
}))(AccountBar);
