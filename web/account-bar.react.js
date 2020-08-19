// @flow

import type { AppState } from './redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { LogOutResult } from 'lib/types/account-types';
import {
  type CurrentUserInfo,
  currentUserPropType,
} from 'lib/types/user-types';
import {
  type PreRequestUserState,
  preRequestUserStatePropType,
} from 'lib/types/session-types';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { logOut, logOutActionTypes } from 'lib/actions/user-actions';
import { connect } from 'lib/utils/redux-utils';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';

import css from './style.css';
import LogInModal from './modals/account/log-in-modal.react';
import RegisterModal from './modals/account/register-modal.react';
import UserSettingsModal from './modals/account/user-settings-modal.react.js';
import { UpCaret, DownCaret } from './vectors.react';
import { htmlTargetFromEvent } from './vector-utils';

type Props = {|
  setModal: (modal: ?React.Node) => void,
  // Redux state
  currentUserInfo: ?CurrentUserInfo,
  preRequestUserState: PreRequestUserState,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  logOut: (preRequestUserState: PreRequestUserState) => Promise<LogOutResult>,
|};
type State = {|
  expanded: boolean,
|};
class AccountBar extends React.PureComponent<Props, State> {
  static propTypes = {
    setModal: PropTypes.func.isRequired,
    currentUserInfo: currentUserPropType,
    preRequestUserState: preRequestUserStatePropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    logOut: PropTypes.func.isRequired,
  };
  state = {
    expanded: false,
  };
  menu: ?HTMLDivElement;

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.expanded && !prevState.expanded) {
      invariant(this.menu, 'menu ref should be set');
      this.menu.focus();
    }
  }

  get loggedIn() {
    return !!(
      this.props.currentUserInfo &&
      !this.props.currentUserInfo.anonymous &&
      true
    );
  }

  get username() {
    return this.props.currentUserInfo && !this.props.currentUserInfo.anonymous
      ? this.props.currentUserInfo.username
      : undefined;
  }

  render() {
    if (!this.loggedIn) {
      return (
        <div className={css['account-bar']}>
          <div className={css['account-button']}>
            <span>
              <a href="#" onClick={this.onLogIn}>
                Log in
              </a>
              {' · '}
              <a href="#" onClick={this.onRegister}>
                Register
              </a>
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
            <a href="#" onClick={this.onLogOut}>
              Log out
            </a>
          </div>
          <div>
            <a href="#" onClick={this.onEditAccount}>
              Edit account
            </a>
          </div>
        </div>
      );
    }

    const caret = this.state.expanded ? (
      <UpCaret className={css['account-caret']} />
    ) : (
      <DownCaret className={css['account-caret']} />
    );
    return (
      <div className={css['account-bar']} onMouseDown={this.onMouseDown}>
        <div className={css['account-button']}>
          <span>{'logged in as '}</span>
          <span className={css['username']}>{this.username}</span>
          {caret}
        </div>
        {menu}
      </div>
    );
  }

  menuRef = (menu: ?HTMLDivElement) => {
    this.menu = menu;
  };

  onBlur = () => {
    this.setState({ expanded: false });
  };

  // Throw away typechecking here because SyntheticEvent isn't typed
  onMenuKeyDown = (event: any) => {
    if (event.keyCode === 27) {
      // Esc
      this.setState({ expanded: false });
    }
  };

  onMouseDown = (event: SyntheticEvent<HTMLDivElement>) => {
    if (!this.state.expanded) {
      // This prevents onBlur from firing on div.account-menu
      event.preventDefault();
      this.setState({ expanded: true });
      return;
    }
    const target = htmlTargetFromEvent(event);
    invariant(this.menu, 'menu ref not set');
    if (this.menu.contains(target)) {
      // This prevents onBlur from firing on div.account-menu
      event.preventDefault();
    } else {
      this.setState({ expanded: false });
    }
  };

  onLogOut = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.dispatchActionPromise(
      logOutActionTypes,
      this.props.logOut(this.props.preRequestUserState),
    );
    this.setState({ expanded: false });
  };

  onEditAccount = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    // This will blur the focus off the menu which will set expanded to false
    this.props.setModal(<UserSettingsModal setModal={this.props.setModal} />);
  };

  onLogIn = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.setModal(<LogInModal setModal={this.props.setModal} />);
  };

  onRegister = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.setModal(<RegisterModal setModal={this.props.setModal} />);
  };
}

export default connect(
  (state: AppState) => ({
    currentUserInfo: state.currentUserInfo,
    preRequestUserState: preRequestUserStateSelector(state),
  }),
  { logOut },
)(AccountBar);
