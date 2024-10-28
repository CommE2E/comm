// @flow

import * as React from 'react';

import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from 'lib/hooks/account-hooks.js';
import { usePersistedStateLoaded } from 'lib/selectors/app-state-selectors.js';

import { logInActionType, logOutActionType } from './action-types.js';
import ModalPruner from './modal-pruner.react.js';
import NavFromReduxHandler from './nav-from-redux-handler.react.js';
import { useIsAppLoggedIn } from './nav-selectors.js';
import { NavContext, type NavAction } from './navigation-context.js';
import PolicyAcknowledgmentHandler from './policy-acknowledgment-handler.react.js';
import ThreadScreenTracker from './thread-screen-tracker.react.js';
import { MissingRegistrationDataHandler } from '../account/registration/missing-registration-data/missing-registration-data-handler.react.js';
import DevTools from '../redux/dev-tools.react.js';

const NavigationHandler: React.ComponentType<{}> = React.memo<{}>(
  function NavigationHandler() {
    const navContext = React.useContext(NavContext);
    const persistedStateLoaded = usePersistedStateLoaded();

    const devTools = __DEV__ ? <DevTools key="devTools" /> : null;

    if (!navContext || !persistedStateLoaded) {
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
        <PolicyAcknowledgmentHandler />
        <MissingRegistrationDataHandler />
        {devTools}
      </>
    );
  },
);
NavigationHandler.displayName = 'NavigationHandler';

type LogInHandlerProps = {
  +dispatch: (action: NavAction) => void,
};
const LogInHandler = React.memo<LogInHandlerProps>(function LogInHandler(
  props: LogInHandlerProps,
) {
  const { dispatch } = props;

  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();

  const navLoggedIn = useIsAppLoggedIn();
  const prevLoggedInRef = React.useRef<?boolean>();

  React.useEffect(() => {
    if (loggedIn === prevLoggedInRef.current) {
      return;
    }
    prevLoggedInRef.current = loggedIn;
    if (loggedIn && !navLoggedIn) {
      dispatch({ type: (logInActionType: 'LOG_IN') });
    } else if (!loggedIn && navLoggedIn) {
      dispatch({ type: (logOutActionType: 'LOG_OUT') });
    }
  }, [navLoggedIn, loggedIn, dispatch]);

  return null;
});
LogInHandler.displayName = 'LogInHandler';

export default NavigationHandler;
