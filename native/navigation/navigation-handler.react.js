// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors';

import DevTools from '../redux/dev-tools.react';
import type { AppState } from '../redux/state-types';
import { useSelector } from '../redux/redux-utils';
import { logInActionType, logOutActionType } from './action-types';
import ModalPruner from './modal-pruner.react';
import NavFromReduxHandler from './nav-from-redux-handler.react';
import { useIsAppLoggedIn } from './nav-selectors';
import { NavContext, type NavAction } from './navigation-context';
import ThreadScreenTracker from './thread-screen-tracker.react';

const NavigationHandler = React.memo<{||}>(() => {
  const navContext = React.useContext(NavContext);
  const reduxRehydrated = useSelector(
    (state: AppState) => !!(state._persist && state._persist.rehydrated),
  );

  const devTools = __DEV__ ? <DevTools key="devTools" /> : null;

  if (!navContext || !reduxRehydrated) {
    if (__DEV__) {
      return (
        <>
          <NavFromReduxHandler />
          {devTools}
        </>
      );
    } else {
      return null;
    }
  }

  const { dispatch } = navContext;
  return (
    <>
      <LogInHandler dispatch={dispatch} />
      <ThreadScreenTracker />
      <ModalPruner navContext={navContext} />
      {devTools}
    </>
  );
});
NavigationHandler.displayName = 'NavigationHandler';

type LogInHandlerProps = {|
  dispatch: (action: NavAction) => void,
|};
const LogInHandler = React.memo<LogInHandlerProps>(
  (props: LogInHandlerProps) => {
    const { dispatch } = props;

    const hasCurrentUserInfo = useSelector(isLoggedIn);
    const hasUserCookie = useSelector(
      (state: AppState) => !!(state.cookie && state.cookie.startsWith('user=')),
    );
    const loggedIn = hasCurrentUserInfo && hasUserCookie;

    const navLoggedIn = useIsAppLoggedIn();

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
        dispatch({ type: (logInActionType: 'LOG_IN') });
      } else if (!loggedIn && navLoggedIn) {
        dispatch({ type: (logOutActionType: 'LOG_OUT') });
      }
    }, [navLoggedIn, prevLoggedIn, loggedIn, dispatch]);

    return null;
  },
);
LogInHandler.displayName = 'LogInHandler';

export default NavigationHandler;
