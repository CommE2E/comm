// @flow

import { AppState as NativeAppState, Alert } from 'react-native';
import { createStore, applyMiddleware, type Store, compose } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import thunk from 'redux-thunk';

import { setClientDBStoreActionType } from 'lib/actions/client-db-store-actions.js';
import { legacySiweAuthActionTypes } from 'lib/actions/siwe-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  legacyLogInActionTypes,
  keyserverAuthActionTypes,
  deleteKeyserverAccountActionTypes,
} from 'lib/actions/user-actions.js';
import { setNewSessionActionType } from 'lib/keyserver-conn/keyserver-conn-types.js';
import type { ThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import { reduceBackupStore } from 'lib/reducers/backup-reducer.js';
import { queueDBOps } from 'lib/reducers/db-ops-reducer.js';
import { reduceLoadingStatuses } from 'lib/reducers/loading-reducer.js';
import baseReducer from 'lib/reducers/master-reducer.js';
import { reduceCurrentUserInfo } from 'lib/reducers/user-reducer.js';
import { shouldClearData } from 'lib/shared/data-utils.js';
import {
  invalidSessionDowngrade,
  invalidSessionRecovery,
  identityInvalidSessionDowngrade,
} from 'lib/shared/session-utils.js';
import { isStaff } from 'lib/shared/staff-utils.js';
import { processDMOpsActionType } from 'lib/types/dm-ops.js';
import type { Dispatch, BaseAction } from 'lib/types/redux-types.js';
import { rehydrateActionType } from 'lib/types/redux-types.js';
import type { SetSessionPayload } from 'lib/types/session-types.js';
import { reduxLoggerMiddleware } from 'lib/utils/action-logger.js';
import { resetUserSpecificState } from 'lib/utils/reducers-utils.js';

import {
  updateDimensionsActiveType,
  updateConnectivityActiveType,
  updateDeviceCameraInfoActionType,
  updateDeviceOrientationActionType,
  backgroundActionTypes,
  setReduxStateActionType,
  setStoreLoadedActionType,
  type Action,
  setLocalSettingsActionType,
} from './action-types.js';
import { setAccessTokenActionType } from './action-types.js';
import { defaultState } from './default-state.js';
import { remoteReduxDevServerConfig } from './dev-tools.js';
import { persistConfig, setPersistor } from './persist.js';
import { onStateDifference } from './redux-debug-utils.js';
import type { AppState } from './state-types.js';
import { nonUserSpecificFieldsNative } from './state-types.js';
import { getGlobalNavContext } from '../navigation/icky-global.js';
import { activeMessageListSelector } from '../navigation/nav-selectors.js';
import reactotron from '../reactotron.js';
import { appOutOfDateAlertDetails } from '../utils/alert-messages.js';
import { isStaffRelease } from '../utils/staff-utils.js';
import { getDevServerHostname } from '../utils/url-utils.js';

function reducer(state: AppState = defaultState, inputAction: Action) {
  let action = inputAction;

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
    const defaultKeys: $ReadOnlyArray<string> = Object.keys(defaultState);
    const expectedKeys = defaultKeys.filter(
      each => !persistConfig.blacklist.includes(each),
    );
    const expectedKeysSet = new Set(expectedKeys);

    // 2. Construct set of keys actually REHYDRATED
    const rehydratedKeys: $ReadOnlyArray<string> = Object.keys(
      action.payload ?? {},
    );
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
    (action.type === logOutActionTypes.success ||
      action.type === deleteAccountActionTypes.success) &&
    identityInvalidSessionDowngrade(
      state,
      action.payload.currentUserInfo,
      action.payload.preRequestUserState,
    )
  ) {
    return {
      ...state,
      loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
    };
  }

  if (
    action.type === setNewSessionActionType &&
    invalidSessionDowngrade(
      state,
      action.payload.sessionChange.currentUserInfo,
      action.payload.preRequestUserState,
      action.payload.keyserverID,
    )
  ) {
    return {
      ...state,
      loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
    };
  } else if (action.type === deleteKeyserverAccountActionTypes.success) {
    const { currentUserInfo, preRequestUserState } = action.payload;
    const newKeyserverIDs = [];
    for (const keyserverID of action.payload.keyserverIDs) {
      if (
        invalidSessionDowngrade(
          state,
          currentUserInfo,
          preRequestUserState,
          keyserverID,
        )
      ) {
        continue;
      }
      newKeyserverIDs.push(keyserverID);
    }
    if (newKeyserverIDs.length === 0) {
      return {
        ...state,
        loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
      };
    }
    action = {
      ...action,
      payload: {
        ...action.payload,
        keyserverIDs: newKeyserverIDs,
      },
    };
  }

  if (
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.currentUserInfo &&
      invalidSessionRecovery(
        state,
        action.payload.preRequestUserState?.currentUserInfo,
        action.payload.authActionSource,
      )) ||
    ((action.type === legacyLogInActionTypes.success ||
      action.type === legacySiweAuthActionTypes.success) &&
      invalidSessionRecovery(
        state,
        action.payload.preRequestUserInfo,
        action.payload.authActionSource,
      )) ||
    (action.type === keyserverAuthActionTypes.success &&
      invalidSessionRecovery(
        state,
        action.payload.preRequestUserInfo,
        action.payload.authActionSource,
      ))
  ) {
    return state;
  }

  if (action.type === updateDimensionsActiveType) {
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
  } else if (action.type === setAccessTokenActionType) {
    return { ...state, commServicesAccessToken: action.payload };
  }

  if (action.type === setNewSessionActionType) {
    sessionInvalidationAlert(action.payload);
  }
  if (action.type === setStoreLoadedActionType) {
    return {
      ...state,
      initialStateLoaded: true,
    };
  }
  if (action.type === setClientDBStoreActionType) {
    state = {
      ...state,
      initialStateLoaded: true,
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

  // We're calling this reducer twice: here and in the baseReducer. This call
  // is only used to determine the new current user ID. We don't want to use
  // the remaining part of the current user info, because it is possible that
  // the reducer returned a modified ID without cleared remaining parts of
  // the current user info - this would be a bug, but we want to be extra
  // careful when clearing the state.
  // When newCurrentUserInfo has the same ID as state.currentUserInfo the state
  // won't be cleared and the current user info determined in baseReducer will
  // be equal to the newCurrentUserInfo.
  // When newCurrentUserInfo has different ID than state.currentUserInfo, we
  // reset the state and pass it to the baseReducer. Then, in baseReducer,
  // reduceCurrentUserInfo acts on the cleared state and may return a different
  // result than newCurrentUserInfo.
  // Overall, the solution is a little wasteful, but makes us sure that we never
  // keep the info of the user when the current user ID changes.
  const newCurrentUserInfo = reduceCurrentUserInfo(
    state.currentUserInfo,
    action,
  );
  if (shouldClearData(state.currentUserInfo?.id, newCurrentUserInfo?.id)) {
    state = resetUserSpecificState(
      state,
      defaultState,
      nonUserSpecificFieldsNative,
    );
  }

  const baseReducerResult = baseReducer(
    state,
    (action: BaseAction),
    onStateDifference,
  );
  state = baseReducerResult.state;

  const { storeOperations } = baseReducerResult;

  const fixUnreadActiveThreadResult = fixUnreadActiveThread(state, action);
  state = fixUnreadActiveThreadResult.state;

  const threadStoreOperationsWithUnreadFix = [
    ...(storeOperations.threadStoreOperations ?? []),
    ...fixUnreadActiveThreadResult.threadStoreOperations,
  ];

  const ops = {
    ...storeOperations,
    threadStoreOperations: threadStoreOperationsWithUnreadFix,
  };

  let notificationsCreationData = null;
  if (action.type === processDMOpsActionType) {
    notificationsCreationData = action.payload.notificationsCreationData;
  }

  state = {
    ...state,
    dbOpsStore: queueDBOps(
      state.dbOpsStore,
      action.dispatchMetadata,
      ops,
      notificationsCreationData,
    ),
    backupStore: reduceBackupStore(state.backupStore, action),
  };

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
    Alert.alert(
      appOutOfDateAlertDetails.title,
      appOutOfDateAlertDetails.message,
      [{ text: 'OK' }],
      {
        cancelable: true,
      },
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

  const activeThreadInfo = state.threadStore.threadInfos[activeThread];
  const updatedActiveThreadInfo = {
    ...activeThreadInfo,
    currentUser: {
      ...activeThreadInfo.currentUser,
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
    maxAge: 200,
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
