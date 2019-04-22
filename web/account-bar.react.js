// @flow

import type { AppState } from './redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { LogOutResult } from 'lib/types/account-types';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { logOut, logOutActionTypes } from 'lib/actions/user-actions';
import { connect } from 'lib/utils/redux-utils';

import css from './style.css';
import LogInModal from './modals/account/log-in-modal.react';
import RegisterModal from './modals/account/register-modal.react';
import UserSettingsModal from './modals/account/user-settings-modal.react.js';
import { UpCaret, DownCaret } from './vectors.react';
import { htmlTargetFromEvent } from './vector-utils';

type Props = {|
  setModal: (modal: ?React.Node) => void,
  // Redux state
  loggedIn: bool,
  username: ?string,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  logOut: () => Promise<LogOutResult>,
|};
type State = {|
  expanded: bool,
|};
class AccountBar extends React.PureComponent<Props, State> {

  static propTypes = {
    setModal: PropTypes.func.isRequired,
    loggedIn: PropTypes.bool.isRequired,
    username: PropTypes.string,
    dispatchActionPromise: PropTypes.func.isRequired,
    logOut: PropTypes.func.isRequired,
  };
  state = {
    expanded: false,
  };
  menu: ?HTMLDivElement;

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.expanded && !prevState.expanded) {
      invariant(this.menu, "menu ref should be set");
      this.menu.focus();
    }
  }

  render() {
    if (!this.props.loggedIn) {
      return (
        <div className={css['account-bar']}>
          <div className={css['account-button']}>
            <span>
              <a href="#" onClick={this.onLogIn}>Log in</a>
              {" · "}
              <a href="#" onClick={this.onRegister}>Register</a>
            </span>
          </div>
        </div>
      );
    }

    let menu = null;
    if (this.state.expanded) {
      menu = (
        <div
          className={css['account-menu']}
          tabIndex="0"
          onBlur={this.onBlur}
          onKeyDown={this.onMenuKeyDown}
          ref={this.menuRef}
        >
          <div>
            <a
              href="#"
              onClick={this.onLogOut}
            >Log out</a>
          </div>
          <div>
            <a
              href="#"
              onClick={this.onEditAccount}
            >Edit account</a>
          </div>
        </div>
      );
    }

    const caret = this.state.expanded
      ? <UpCaret className={css['account-caret']} />
      : <DownCaret className={css['account-caret']} />;
    return (
      <div className={css['account-bar']} onMouseDown={this.onMouseDown}>
        <div className={css['account-button']}>
          <span>{"logged in as "}</span>
          <span className={css['username']}>{this.props.username}</span>
          {caret}
        </div>
        {menu}
      </div>
    );
  }

  menuRef = (menu: ?HTMLDivElement) => {
    this.menu = menu;
  }

  onBlur = () => {
    this.setState({ expanded: false });
  }

  // Throw away typechecking here because SyntheticEvent isn't typed
  onMenuKeyDown = (event: any) => {
    if (event.keyCode === 27) { // Esc
      this.setState({ expanded: false });
    }
  }

  onMouseDown = (event: SyntheticEvent<HTMLDivElement>) => {
    if (!this.state.expanded) {
      // This prevents onBlur from firing on div.account-menu
      event.preventDefault();
      this.setState({ expanded: true });
      return;
    }
    const target = htmlTargetFromEvent(event);
    invariant(this.menu, "menu ref not set");
    if (this.menu.contains(target)) {
      // This prevents onBlur from firing on div.account-menu
      event.preventDefault();
    } else {
      this.setState({ expanded: false });
    }
  }

  onLogOut = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.dispatchActionPromise(logOutActionTypes, this.props.logOut());
    this.setState({ expanded: false });
  }

  onEditAccount = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    // This will blur the focus off the menu which will set expanded to false
    this.props.setModal(<UserSettingsModal setModal={this.props.setModal} />);
  }

  onLogIn = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.setModal(<LogInModal setModal={this.props.setModal} />);
  }

  onRegister = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.setModal(<RegisterModal setModal={this.props.setModal} />);
  }

}

export default connect(
  (state: AppState) => ({
    loggedIn: !!(state.currentUserInfo &&
      !state.currentUserInfo.anonymous && true),
    username: state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo.username
      : undefined,
  }),
  { logOut },
)(AccountBar);
