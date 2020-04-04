// @flow

import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { useSelector } from 'react-redux';

import { NavContext, type NavAction } from './navigation-context';
import { useIsAppLoggedIn } from './nav-selectors';
import LinkingHandler from './linking-handler.react';
import ThreadScreenTracker from './thread-screen-tracker.react';
import ModalPruner from './modal-pruner.react';
import NavFromReduxHandler from './nav-from-redux-handler.react';
import { logInActionType, logOutActionType } from './action-types';

const NavigationHandler = React.memo<{||}>(() => {
  const navContext = React.useContext(NavContext);
  const reduxRehydrated = useSelector(
    (state: AppState) => !!(state._persist && state._persist.rehydrated),
  );

  if (!navContext || !reduxRehydrated) {
    if (__DEV__) {
      return <NavFromReduxHandler />;
    } else {
      return null;
    }
  }

  const { dispatch } = navContext;
  return (
    <>
      <LogInHandler dispatch={dispatch} />
      <LinkingHandler dispatch={dispatch} />
      <ThreadScreenTracker />
      <ModalPruner navContext={navContext} />
    </>
  );
});
NavigationHandler.displayName = 'NavigationHandler';

type LogInHandlerProps = {|
  dispatch: (action: NavAction) => boolean,
|};
const LogInHandler = React.memo<LogInHandlerProps>(
  (props: LogInHandlerProps) => {
    const { dispatch } = props;

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
