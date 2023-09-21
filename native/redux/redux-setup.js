// @flow

import { AppState as NativeAppState, Platform, Alert } from 'react-native';
import { createStore, applyMiddleware, type Store, compose } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import thunk from 'redux-thunk';

import { setClientDBStoreActionType } from 'lib/actions/client-db-store-actions.js';
import { siweAuthActionTypes } from 'lib/actions/siwe-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
} from 'lib/actions/user-actions.js';
import type { ThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import baseReducer from 'lib/reducers/master-reducer.js';
import {
  invalidSessionDowngrade,
  invalidSessionRecovery,
} from 'lib/shared/session-utils.js';
import { isStaff } from 'lib/shared/staff-utils.js';
import type { Dispatch, BaseAction } from 'lib/types/redux-types.js';
import { rehydrateActionType } from 'lib/types/redux-types.js';
import type { SetSessionPayload } from 'lib/types/session-types.js';
import { reduxLoggerMiddleware } from 'lib/utils/action-logger.js';
import { setNewSessionActionType } from 'lib/utils/action-utils.js';

import {
  updateDimensionsActiveType,
  updateConnectivityActiveType,
  updateThemeInfoActionType,
  updateDeviceCameraInfoActionType,
  updateDeviceOrientationActionType,
  backgroundActionTypes,
  setReduxStateActionType,
  setStoreLoadedActionType,
  type Action,
  setLocalSettingsActionType,
} from './action-types.js';
import { defaultState } from './default-state.js';
import { remoteReduxDevServerConfig } from './dev-tools.js';
import { persistConfig, setPersistor } from './persist.js';
import { processDBStoreOperations } from './redux-utils.js';
import type { AppState } from './state-types.js';
import reduceGlobalThemeInfo from './theme-reducer.js';
import { getGlobalNavContext } from '../navigation/icky-global.js';
import { activeMessageListSelector } from '../navigation/nav-selectors.js';
import reactotron from '../reactotron.js';
import { isStaffRelease } from '../utils/staff-utils.js';
import { setCustomServer, getDevServerHostname } from '../utils/url-utils.js';

function reducer(state: AppState = defaultState, action: Action) {
  if (action.type === setReduxStateActionType) {
    return action.payload.state;
  }

  // We want to alert staff/developers if there's a difference between the keys
  // we expect to see REHYDRATED and the keys that are actually REHYDRATED.
  // Context: https://linear.app/comm/issue/ENG-2127/
  if (
    action.type === rehydrateActionType &&
    (__DEV__ ||
      isStaffRelease ||
      (state.currentUserInfo &&
        state.currentUserInfo.id &&
        isStaff(state.currentUserInfo.id)))
  ) {
    // 1. Construct set of keys expected to be REHYDRATED
    const defaultKeys = Object.keys(defaultState);
    const expectedKeys = defaultKeys.filter(
      each => !persistConfig.blacklist.includes(each),
    );
    const expectedKeysSet = new Set(expectedKeys);

    // 2. Construct set of keys actually REHYDRATED
    const rehydratedKeys = Object.keys(action.payload ?? {});
    const rehydratedKeysSet = new Set(rehydratedKeys);

    // 3. Determine the difference between the two sets
    const expectedKeysNotRehydrated = expectedKeys.filter(
      each => !rehydratedKeysSet.has(each),
    );
    const rehydratedKeysNotExpected = rehydratedKeys.filter(
      each => !expectedKeysSet.has(each),
    );

    // 4. Display alerts with the differences between the two sets
    if (expectedKeysNotRehydrated.length > 0) {
      Alert.alert(
        `EXPECTED KEYS NOT REHYDRATED: ${JSON.stringify(
          expectedKeysNotRehydrated,
        )}`,
      );
    }
    if (rehydratedKeysNotExpected.length > 0) {
      Alert.alert(
        `REHYDRATED KEYS NOT EXPECTED: ${JSON.stringify(
          rehydratedKeysNotExpected,
        )}`,
      );
    }
  }

  if (
    (action.type === setNewSessionActionType &&
      invalidSessionDowngrade(
        state,
        action.payload.sessionChange.currentUserInfo,
        action.payload.preRequestUserState,
      )) ||
    (action.type === logOutActionTypes.success &&
      invalidSessionDowngrade(
        state,
        action.payload.currentUserInfo,
        action.payload.preRequestUserState,
      )) ||
    (action.type === deleteAccountActionTypes.success &&
      invalidSessionDowngrade(
        state,
        action.payload.currentUserInfo,
        action.payload.preRequestUserState,
      ))
  ) {
    return state;
  }
  if (
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.currentUserInfo &&
      invalidSessionRecovery(
        state,
        action.payload.sessionChange.currentUserInfo,
        action.payload.logInActionSource,
      )) ||
    ((action.type === logInActionTypes.success ||
      action.type === siweAuthActionTypes.success) &&
      invalidSessionRecovery(
        state,
        action.payload.currentUserInfo,
        action.payload.logInActionSource,
      ))
  ) {
    return state;
  }

  state = {
    ...state,
    globalThemeInfo: reduceGlobalThemeInfo(state.globalThemeInfo, action),
  };

  if (action.type === setCustomServer) {
    return {
      ...state,
      customServer: action.payload,
    };
  } else if (action.type === updateDimensionsActiveType) {
    return {
      ...state,
      dimensions: {
        ...state.dimensions,
        ...action.payload,
      },
    };
  } else if (action.type === updateConnectivityActiveType) {
    return {
      ...state,
      connectivity: action.payload,
    };
  } else if (action.type === updateThemeInfoActionType) {
    // Handled above by reduceGlobalThemeInfo
    return state;
  } else if (action.type === updateDeviceCameraInfoActionType) {
    return {
      ...state,
      deviceCameraInfo: {
        ...state.deviceCameraInfo,
        ...action.payload,
      },
    };
  } else if (action.type === updateDeviceOrientationActionType) {
    return {
      ...state,
      deviceOrientation: action.payload,
    };
  } else if (action.type === setLocalSettingsActionType) {
    return {
      ...state,
      localSettings: { ...state.localSettings, ...action.payload },
    };
  } else if (
    action.type === logOutActionTypes.started ||
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    return {
      ...state,
      localSettings: { isBackupEnabled: false },
    };
  }

  if (action.type === setNewSessionActionType) {
    sessionInvalidationAlert(action.payload);
  }
  if (action.type === setStoreLoadedActionType) {
    return {
      ...state,
      storeLoaded: true,
    };
  }
  if (action.type === setClientDBStoreActionType) {
    state = {
      ...state,
      storeLoaded: true,
    };
    const currentLoggedInUserID = state.currentUserInfo?.anonymous
      ? undefined
      : state.currentUserInfo?.id;
    const actionCurrentLoggedInUserID = action.payload.currentUserID;
    if (
      !currentLoggedInUserID ||
      !actionCurrentLoggedInUserID ||
      actionCurrentLoggedInUserID !== currentLoggedInUserID
    ) {
      // If user is logged out now, was logged out at the time action was
      // dispatched or their ID changed between action dispatch and a
      // call to reducer we ignore the SQLite data since it is not valid
      return state;
    }
  }

  const baseReducerResult = baseReducer(state, (action: BaseAction));
  state = baseReducerResult.state;

  const { storeOperations } = baseReducerResult;
  const {
    draftStoreOperations,
    threadStoreOperations,
    messageStoreOperations,
    reportStoreOperations,
  } = storeOperations;

  const fixUnreadActiveThreadResult = fixUnreadActiveThread(state, action);
  state = fixUnreadActiveThreadResult.state;

  const threadStoreOperationsWithUnreadFix = [
    ...threadStoreOperations,
    ...fixUnreadActiveThreadResult.threadStoreOperations,
  ];

  processDBStoreOperations({
    draftStoreOperations,
    messageStoreOperations,
    threadStoreOperations: threadStoreOperationsWithUnreadFix,
    reportStoreOperations,
  });

  return state;
}

function sessionInvalidationAlert(payload: SetSessionPayload) {
  if (
    !payload.sessionChange.cookieInvalidated ||
    !payload.preRequestUserState ||
    !payload.preRequestUserState.currentUserInfo ||
    payload.preRequestUserState.currentUserInfo.anonymous
  ) {
    return;
  }
  if (payload.error === 'client_version_unsupported') {
    const app = Platform.select({
      ios: 'App Store',
      android: 'Play Store',
    });
    Alert.alert(
      'App out of date',
      'Your app version is pretty old, and the server doesn’t know how to ' +
        `speak to it anymore. Please use the ${app} app to update!`,
      [{ text: 'OK' }],
      { cancelable: true },
    );
  } else {
    Alert.alert(
      'Session invalidated',
      'We’re sorry, but your session was invalidated by the server. ' +
        'Please log in again.',
      [{ text: 'OK' }],
      { cancelable: true },
    );
  }
}

// Makes sure a currently focused thread is never unread. Note that we consider
// a backgrounded NativeAppState to actually be active if it last changed to
// inactive more than 10 seconds ago. This is because there is a delay when
// NativeAppState is updating in response to a foreground, and actions don't get
// processed more than 10 seconds after a backgrounding anyways. However we
// don't consider this for action types that can be expected to happen while the
// app is backgrounded.
type FixUnreadActiveThreadResult = {
  +state: AppState,
  +threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
};
function fixUnreadActiveThread(
  state: AppState,
  action: *,
): FixUnreadActiveThreadResult {
  const navContext = getGlobalNavContext();
  const activeThread = activeMessageListSelector(navContext);
  if (
    !activeThread ||
    !state.threadStore.threadInfos[activeThread]?.currentUser.unread ||
    (NativeAppState.currentState !== 'active' &&
      (appLastBecameInactive + 10000 >= Date.now() ||
        backgroundActionTypes.has(action.type)))
  ) {
    return { state, threadStoreOperations: [] };
  }

  const updatedActiveThreadInfo = {
    ...state.threadStore.threadInfos[activeThread],
    currentUser: {
      ...state.threadStore.threadInfos[activeThread].currentUser,
      unread: false,
    },
  };

  const threadStoreOperations = [
    {
      type: 'replace',
      payload: {
        id: activeThread,
        threadInfo: updatedActiveThreadInfo,
      },
    },
  ];

  const updatedThreadStore = threadStoreOpsHandlers.processStoreOperations(
    state.threadStore,
    threadStoreOperations,
  );

  return {
    state: { ...state, threadStore: updatedThreadStore },
    threadStoreOperations,
  };
}

let appLastBecameInactive = 0;
function appBecameInactive() {
  appLastBecameInactive = Date.now();
}

const middleware = applyMiddleware(thunk, reduxLoggerMiddleware);

let composeFunc = compose;
if (__DEV__ && global.HermesInternal) {
  const { composeWithDevTools } = require('remote-redux-devtools/src/index.js');
  composeFunc = composeWithDevTools({
    name: 'Redux',
    hostname: getDevServerHostname(),
    ...remoteReduxDevServerConfig,
  });
} else if (global.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
  composeFunc = global.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
    name: 'Redux',
  });
}

let enhancers;
if (reactotron) {
  enhancers = composeFunc(middleware, reactotron.createEnhancer());
} else {
  enhancers = composeFunc(middleware);
}

const store: Store<AppState, *> = createStore(
  persistReducer(persistConfig, reducer),
  defaultState,
  enhancers,
);
const persistor = persistStore(store);
setPersistor(persistor);

const unsafeDispatch: any = store.dispatch;
const dispatch: Dispatch = unsafeDispatch;

export { store, dispatch, appBecameInactive };
