// @flow

import invariant from 'invariant';
import * as React from 'react';

import { logOut, logOutActionTypes } from 'lib/actions/user-actions';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';
import type { LogOutResult } from 'lib/types/account-types';
import type { PreRequestUserState } from 'lib/types/session-types';
import type { CurrentUserInfo } from 'lib/types/user-types';
import {
  useServerCall,
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/action-utils';

import LogInModal from './modals/account/log-in-modal.react';
import UserSettingsModal from './modals/account/user-settings-modal.react.js';
import { useSelector } from './redux/redux-utils';
import css from './style.css';
import { htmlTargetFromEvent } from './vector-utils';
import { UpCaret, DownCaret } from './vectors.react';

type BaseProps = {
  +setModal: (modal: ?React.Node) => void,
};
type Props = {
  ...BaseProps,
  // Redux state
  +currentUserInfo: ?CurrentUserInfo,
  +preRequestUserState: PreRequestUserState,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +logOut: (preRequestUserState: PreRequestUserState) => Promise<LogOutResult>,
};
type State = {
  +expanded: boolean,
};
class AccountBar extends React.PureComponent<Props, State> {
  state: State = {
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
}

const ConnectedAccountBar: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedAccountBar(props) {
    const currentUserInfo = useSelector(state => state.currentUserInfo);
    const preRequestUserState = useSelector(preRequestUserStateSelector);
    const dispatchActionPromise = useDispatchActionPromise();
    const boundLogOut = useServerCall(logOut);
    return (
      <AccountBar
        {...props}
        currentUserInfo={currentUserInfo}
        preRequestUserState={preRequestUserState}
        dispatchActionPromise={dispatchActionPromise}
        logOut={boundLogOut}
      />
    );
  },
);

export default ConnectedAccountBar;
