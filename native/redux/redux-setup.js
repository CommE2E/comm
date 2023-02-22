// @flow

import { AppState as NativeAppState, Platform, Alert } from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { createStore, applyMiddleware, type Store, compose } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import thunk from 'redux-thunk';

import { setClientDBStoreActionType } from 'lib/actions/client-db-store-actions.js';
import { setDeviceTokenActionTypes } from 'lib/actions/device-actions.js';
import { siweAuthActionTypes } from 'lib/actions/siwe-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
} from 'lib/actions/user-actions.js';
import baseReducer from 'lib/reducers/master-reducer.js';
import { processThreadStoreOperations } from 'lib/reducers/thread-reducer.js';
import {
  invalidSessionDowngrade,
  invalidSessionRecovery,
} from 'lib/shared/account-utils.js';
import { isStaff } from 'lib/shared/user-utils.js';
import { defaultEnabledApps } from 'lib/types/enabled-apps.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import type { Dispatch, BaseAction } from 'lib/types/redux-types.js';
import { rehydrateActionType } from 'lib/types/redux-types.js';
import type { SetSessionPayload } from 'lib/types/session-types.js';
import {
  defaultConnectionInfo,
  incrementalStateSyncActionType,
} from 'lib/types/socket-types.js';
import type { ThreadStoreOperation } from 'lib/types/thread-types.js';
import { updateTypes } from 'lib/types/update-types.js';
import { reduxLoggerMiddleware } from 'lib/utils/action-logger.js';
import { setNewSessionActionType } from 'lib/utils/action-utils.js';
import { convertMessageStoreOperationsToClientDBOperations } from 'lib/utils/message-ops-utils.js';
import { convertThreadStoreOperationsToClientDBOperations } from 'lib/utils/thread-ops-utils.js';

import {
  resetUserStateActionType,
  recordNotifPermissionAlertActionType,
  updateDimensionsActiveType,
  updateConnectivityActiveType,
  updateThemeInfoActionType,
  updateDeviceCameraInfoActionType,
  updateDeviceOrientationActionType,
  updateThreadLastNavigatedActionType,
  backgroundActionTypes,
  setReduxStateActionType,
  setStoreLoadedActionType,
  type Action,
} from './action-types.js';
import { remoteReduxDevServerConfig } from './dev-tools.js';
import { defaultDimensionsInfo } from './dimensions-updater.react.js';
import { persistConfig, setPersistor } from './persist.js';
import type { AppState } from './state-types.js';
import { commCoreModule } from '../native-modules.js';
import { defaultNavInfo } from '../navigation/default-state.js';
import { getGlobalNavContext } from '../navigation/icky-global.js';
import { activeMessageListSelector } from '../navigation/nav-selectors.js';
import { defaultNotifPermissionAlertInfo } from '../push/alerts.js';
import reactotron from '../reactotron.js';
import { defaultDeviceCameraInfo } from '../types/camera.js';
import { defaultConnectivityInfo } from '../types/connectivity.js';
import { defaultGlobalThemeInfo } from '../types/themes.js';
import { isTaskCancelledError } from '../utils/error-handling.js';
import { isStaffRelease } from '../utils/staff-utils.js';
import {
  defaultURLPrefix,
  natNodeServer,
  setCustomServer,
  getDevServerHostname,
} from '../utils/url-utils.js';

const defaultState = ({
  navInfo: defaultNavInfo,
  currentUserInfo: null,
  draftStore: { drafts: {} },
  entryStore: {
    entryInfos: {},
    daysToEntries: {},
    lastUserInteractionCalendar: 0,
  },
  threadStore: {
    threadInfos: {},
  },
  userStore: {
    userInfos: {},
    inconsistencyReports: [],
  },
  messageStore: {
    messages: {},
    threads: {},
    local: {},
    currentAsOf: 0,
  },
  storeLoaded: false,
  updatesCurrentAsOf: 0,
  loadingStatuses: {},
  calendarFilters: defaultCalendarFilters,
  cookie: null,
  deviceToken: null,
  dataLoaded: false,
  urlPrefix: defaultURLPrefix,
  customServer: natNodeServer,
  notifPermissionAlertInfo: defaultNotifPermissionAlertInfo,
  connection: defaultConnectionInfo(Platform.OS),
  watchedThreadIDs: [],
  lifecycleState: 'active',
  enabledApps: defaultEnabledApps,
  reportStore: {
    enabledReports: {
      crashReports: __DEV__,
      inconsistencyReports: __DEV__,
      mediaReports: __DEV__,
    },
    queuedReports: [],
  },
  nextLocalID: 0,
  _persist: null,
  dimensions: defaultDimensionsInfo,
  connectivity: defaultConnectivityInfo,
  globalThemeInfo: defaultGlobalThemeInfo,
  deviceCameraInfo: defaultDeviceCameraInfo,
  deviceOrientation: Orientation.getInitialOrientation(),
  frozen: false,
  userPolicies: {},
}: AppState);

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

  if (action.type === setCustomServer) {
    return {
      ...state,
      customServer: action.payload,
    };
  } else if (action.type === recordNotifPermissionAlertActionType) {
    return {
      ...state,
      notifPermissionAlertInfo: {
        totalAlerts: state.notifPermissionAlertInfo.totalAlerts + 1,
        lastAlertTime: action.payload.time,
      },
    };
  } else if (action.type === resetUserStateActionType) {
    const cookie =
      state.cookie && state.cookie.startsWith('anonymous=')
        ? state.cookie
        : null;
    const currentUserInfo =
      state.currentUserInfo && state.currentUserInfo.anonymous
        ? state.currentUserInfo
        : null;
    return {
      ...state,
      currentUserInfo,
      cookie,
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
    return {
      ...state,
      globalThemeInfo: {
        ...state.globalThemeInfo,
        ...action.payload,
      },
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
  } else if (action.type === setDeviceTokenActionTypes.success) {
    return {
      ...state,
      deviceToken: action.payload,
    };
  } else if (action.type === updateThreadLastNavigatedActionType) {
    const { threadID, time } = action.payload;
    if (state.messageStore.threads[threadID]) {
      state = {
        ...state,
        messageStore: {
          ...state.messageStore,
          threads: {
            ...state.messageStore.threads,
            [threadID]: {
              ...state.messageStore.threads[threadID],
              lastNavigatedTo: time,
            },
          },
        },
      };
    }
    return state;
  }

  if (action.type === setNewSessionActionType) {
    sessionInvalidationAlert(action.payload);
    state = {
      ...state,
      cookie: action.payload.sessionChange.cookie,
    };
  } else if (action.type === incrementalStateSyncActionType) {
    let wipeDeviceToken = false;
    for (const update of action.payload.updatesResult.newUpdates) {
      if (
        update.type === updateTypes.BAD_DEVICE_TOKEN &&
        update.deviceToken === state.deviceToken
      ) {
        wipeDeviceToken = true;
        break;
      }
    }
    if (wipeDeviceToken) {
      state = {
        ...state,
        deviceToken: null,
      };
    }
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
  } = storeOperations;

  const fixUnreadActiveThreadResult = fixUnreadActiveThread(state, action);
  state = fixUnreadActiveThreadResult.state;

  const threadStoreOperationsWithUnreadFix = [
    ...threadStoreOperations,
    ...fixUnreadActiveThreadResult.threadStoreOperations,
  ];

  const convertedThreadStoreOperations =
    convertThreadStoreOperationsToClientDBOperations(
      threadStoreOperationsWithUnreadFix,
    );
  const convertedMessageStoreOperations =
    convertMessageStoreOperationsToClientDBOperations(messageStoreOperations);
  (async () => {
    try {
      const promises = [];
      if (convertedThreadStoreOperations.length > 0) {
        promises.push(
          commCoreModule.processThreadStoreOperations(
            convertedThreadStoreOperations,
          ),
        );
      }
      if (convertedMessageStoreOperations.length > 0) {
        promises.push(
          commCoreModule.processMessageStoreOperations(
            convertedMessageStoreOperations,
          ),
        );
      }
      if (draftStoreOperations.length > 0) {
        promises.push(
          commCoreModule.processDraftStoreOperations(draftStoreOperations),
        );
      }
      await Promise.all(promises);
    } catch (e) {
      if (isTaskCancelledError(e)) {
        return;
      }
      commCoreModule.terminate();
    }
  })();

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

  const updatedThreadStore = processThreadStoreOperations(
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
