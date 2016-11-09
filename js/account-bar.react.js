// @flow

import React from 'react';

import fetchJSON from './fetch-json';
import LogInModal from './modals/account/log-in-modal.react';
import RegisterModal from './modals/account/register-modal.react';
import UserSettingsModal from './modals/account/user-settings-modal.react.js';

type Props = {
  thisURL: string,
  monthURL: string,
  loggedIn: bool,
  username: string,
  email: string,
  emailVerified: bool,
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
    await fetchJSON('logout.php', {});
    window.location.href = this.props.monthURL;
  }

  onEditAccount(event: SyntheticEvent) {
    this.props.setModal(
      <UserSettingsModal
        thisURL={this.props.thisURL}
        monthURL={this.props.monthURL}
        username={this.props.username}
        email={this.props.email}
        emailVerified={this.props.emailVerified}
        onClose={this.props.clearModal}
        setModal={this.props.setModal}
      />
    );
  }

  onLogIn(event: SyntheticEvent) {
    this.props.setModal(
      <LogInModal
        thisURL={this.props.thisURL}
        onClose={this.props.clearModal}
        setModal={this.props.setModal}
      />
    );
  }

  onRegister(event: SyntheticEvent) {
    this.props.setModal(
      <RegisterModal
        thisURL={this.props.thisURL}
        onClose={this.props.clearModal}
      />
    );
  }

}

AccountBar.propTypes = {
  thisURL: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  username: React.PropTypes.string.isRequired,
  email: React.PropTypes.string.isRequired,
  emailVerified: React.PropTypes.bool.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
};

export default AccountBar;
