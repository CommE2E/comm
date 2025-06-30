// @flow

import { CommonActions } from '@react-navigation/core';
import * as React from 'react';

import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from 'lib/hooks/account-hooks.js';
import { useIsUserDataReady } from 'lib/hooks/backup-hooks.js';
import { usePersistedStateLoaded } from 'lib/selectors/app-state-selectors.js';

import { logInActionType, logOutActionType } from './action-types.js';
import ModalPruner from './modal-pruner.react.js';
import NavFromReduxHandler from './nav-from-redux-handler.react.js';
import { useIsAppLoggedIn, useCurrentLeafRouteName } from './nav-selectors.js';
import { NavContext, type NavAction } from './navigation-context.js';
import PolicyAcknowledgmentHandler from './policy-acknowledgment-handler.react.js';
import {
  RestoreBackupScreenRouteName,
  RestoreBackupErrorScreenRouteName,
  QRAuthProgressScreenRouteName,
  AuthRouteName,
} from './route-names.js';
import ThreadScreenTracker from './thread-screen-tracker.react.js';
import { MissingRegistrationDataHandler } from '../account/registration/missing-registration-data/missing-registration-data-handler.react.js';
import DevTools from '../redux/dev-tools.react.js';
import { useSelector } from '../redux/redux-utils.js';

const NavigationHandler: React.ComponentType<{}> = React.memo(
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
const LogInHandler = React.memo(function LogInHandler(
  props: LogInHandlerProps,
) {
  const { dispatch } = props;

  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();
  const userDataReady = useIsUserDataReady();

  const isRestoreError = useSelector(
    state => state.restoreBackupState.status === 'user_data_restore_failed',
  );

  const navLoggedIn = useIsAppLoggedIn();
  const currentRouteName = useCurrentLeafRouteName();
  const prevStateRef = React.useRef<?string>();

  React.useEffect(() => {
    const currentStateHash = [
      loggedIn.toString(),
      userDataReady.toString(),
      isRestoreError.toString(),
    ].join('#');
    if (currentStateHash === prevStateRef.current) {
      return;
    }
    prevStateRef.current = currentStateHash;

    const appLoggedIn = loggedIn && userDataReady;
    if (!loggedIn && navLoggedIn) {
      // User logged out - show auth flow
      dispatch({ type: (logOutActionType: 'LOG_OUT') });
    } else if (loggedIn && !userDataReady) {
      // User is authenticated but data not ready
      if (
        isRestoreError &&
        currentRouteName !== RestoreBackupErrorScreenRouteName
      ) {
        // Show error screen if not already there
        dispatch(
          CommonActions.navigate({
            name: AuthRouteName,
            params: {
              screen: RestoreBackupErrorScreenRouteName,
              params: {
                errorInfo: {
                  type: 'restore_failed',
                },
              },
            },
          }),
        );
      } else if (
        currentRouteName !== RestoreBackupScreenRouteName &&
        currentRouteName !== QRAuthProgressScreenRouteName
      ) {
        // Show restore screen if not already there
        dispatch(
          CommonActions.navigate({
            name: AuthRouteName,
            params: {
              screen: RestoreBackupScreenRouteName,
            },
          }),
        );
      }
    } else if (appLoggedIn && !navLoggedIn) {
      // User fully authenticated and data ready - show main app
      dispatch({ type: (logInActionType: 'LOG_IN') });
    }
  }, [
    loggedIn,
    userDataReady,
    navLoggedIn,
    isRestoreError,
    currentRouteName,
    dispatch,
  ]);

  return null;
});
LogInHandler.displayName = 'LogInHandler';

export default NavigationHandler;
