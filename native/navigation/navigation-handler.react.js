// @flow

import type { AppState } from '../redux/redux-setup';

import * as React from 'react';

import { connect } from 'lib/utils/redux-utils';

import {
  NavContext,
  connectNav,
  type NavContextType,
} from './navigation-context';
import { appLoggedInSelector } from './nav-selectors';

type Props = {|
  // Navigation state
  navLoggedIn: boolean,
  // Redux state
  loggedIn: boolean,
|};
function NavigationHandler(props: Props) {
  const { navLoggedIn, loggedIn } = props;

  const navContext = React.useContext(NavContext);

  const prevLoggedIn = React.useRef();

  React.useEffect(() => {
    if (!navContext) {
      return;
    }
    if (loggedIn && !prevLoggedIn.current && !navLoggedIn) {
      navContext.dispatch({ type: 'LOG_IN' });
    } else if (!loggedIn && prevLoggedIn.current && navLoggedIn) {
      navContext.dispatch({ type: 'LOG_OUT' });
    }
  }, [navLoggedIn, loggedIn, navContext]);

  React.useEffect(() => {
    prevLoggedIn.current = loggedIn;
  });

  return null;
}

export default connectNav((context: ?NavContextType) => ({
  navLoggedIn: appLoggedInSelector(context),
}))(
  connect((state: AppState) => ({
    loggedIn: !!(
      state.currentUserInfo &&
      !state.currentUserInfo.anonymous &&
      true
    ),
  }))(NavigationHandler),
);
