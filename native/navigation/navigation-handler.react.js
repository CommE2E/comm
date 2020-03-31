// @flow

import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { useSelector } from 'react-redux';

import { NavContext, type NavAction } from './navigation-context';
import { useIsAppLoggedIn } from './nav-selectors';

function NavigationHandler() {
  const navContext = React.useContext(NavContext);

  const reduxRehydrated = useSelector(
    (state: AppState) => !!(state._persist && state._persist.rehydrated),
  );
  const loggedIn = useSelector(
    (state: AppState) =>
      !!(
        state.currentUserInfo &&
        !state.currentUserInfo.anonymous &&
        state.cookie &&
        state.cookie.startsWith('user=')
      ),
  );

  const navLoggedIn = useIsAppLoggedIn();

  if (navContext && reduxRehydrated) {
    return (
      <LogInHandler
        navLoggedIn={navLoggedIn}
        loggedIn={loggedIn}
        dispatch={navContext.dispatch}
      />
    );
  }

  return null;
}

type LogInHandlerProps = {|
  navLoggedIn: boolean,
  loggedIn: boolean,
  dispatch: (action: NavAction) => boolean,
|};
const LogInHandler = React.memo<LogInHandlerProps>(
  (props: LogInHandlerProps) => {
    const { navLoggedIn, loggedIn, dispatch } = props;

    const prevLoggedInRef = React.useRef();
    React.useEffect(() => {
      prevLoggedInRef.current = loggedIn;
    });
    const prevLoggedIn = prevLoggedInRef.current;

    React.useEffect(() => {
      if (loggedIn === prevLoggedIn) {
        return;
      }
      if (loggedIn && !navLoggedIn) {
        dispatch({ type: 'LOG_IN' });
      } else if (!loggedIn && navLoggedIn) {
        dispatch({ type: 'LOG_OUT' });
      }
    }, [navLoggedIn, prevLoggedIn, loggedIn, dispatch]);

    return null;
  },
);
LogInHandler.displayName = 'LogInHandler';

export default NavigationHandler;
