// @flow

import type { AppState, UpdateStore } from './redux-reducer';

import React from 'react';
import { connect } from 'react-redux';
import update from 'immutability-helper';
import classNames from 'classnames';

import fetchJSON from './fetch-json';
import LogInModal from './modals/account/log-in-modal.react';
import RegisterModal from './modals/account/register-modal.react';
import UserSettingsModal from './modals/account/user-settings-modal.react.js';
import { mapStateToUpdateStore } from './redux-utils';
import { currentNavID } from './nav-utils';

type Props = {
  loggedIn: bool,
  username: string,
  currentNavID: ?string,
  updateStore: UpdateStore,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
};

class AccountBar extends React.Component {

  props: Props;

  render() {
    const classes = classNames({
      'lower-left': true,
      'lower-left-null-state': !this.props.currentNavID,
    });
    if (this.props.loggedIn) {
      return (
        <div className={classes}>
          <div className="account-button">
            {"logged in as "}
            <span className="username">{this.props.username}</span>
            <div className="account-menu">
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
        </div>
      );
    } else {
      return (
        <div className={classes}>
          <div className="account-button">
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
        </div>
      );
    }
  }

  async onLogOut(event: SyntheticEvent) {
    event.preventDefault();
    const response = await fetchJSON('logout.php', {});
    if (response.success) {
      this.props.updateStore((prevState: AppState) => update(prevState, {
        calendarInfos: { $set: response.calendar_infos },
        email: { $set: "" },
        loggedIn: { $set: false },
        username: { $set: "" },
        emailVerified: { $set: false },
      }));
    }
  }

  onEditAccount(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <UserSettingsModal
        onClose={this.props.clearModal}
        setModal={this.props.setModal}
      />
    );
  }

  onLogIn(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <LogInModal
        onClose={this.props.clearModal}
        setModal={this.props.setModal}
      />
    );
  }

  onRegister(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <RegisterModal
        onClose={this.props.clearModal}
        setModal={this.props.setModal}
      />
    );
  }

}

AccountBar.propTypes = {
  loggedIn: React.PropTypes.bool.isRequired,
  username: React.PropTypes.string.isRequired,
  currentNavID: React.PropTypes.string,
  updateStore: React.PropTypes.func.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
};

export default connect(
  (state: AppState) => ({
    loggedIn: state.loggedIn,
    username: state.username,
    currentNavID: currentNavID(state),
  }),
  mapStateToUpdateStore,
)(AccountBar);
