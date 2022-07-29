// @flow

import { isEqual } from 'lodash/lang';
import { AppState as NativeAppState, Platform, Alert } from 'react-native';
import ExitApp from 'react-native-exit-app';
import Orientation from 'react-native-orientation-locker';
import { createStore, applyMiddleware, type Store, compose } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import thunk from 'redux-thunk';

import { setDeviceTokenActionTypes } from 'lib/actions/device-actions';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  sqliteOpFailure,
} from 'lib/actions/user-actions';
import baseReducer from 'lib/reducers/master-reducer';
import { processThreadStoreOperations } from 'lib/reducers/thread-reducer';
import {
  invalidSessionDowngrade,
  invalidSessionRecovery,
} from 'lib/shared/account-utils';
import { isStaff } from 'lib/shared/user-utils';
import { defaultEnabledApps } from 'lib/types/enabled-apps';
import { defaultCalendarFilters } from 'lib/types/filter-types';
import type { Dispatch, BaseAction } from 'lib/types/redux-types';
import type { SetSessionPayload } from 'lib/types/session-types';
import {
  defaultConnectionInfo,
  incrementalStateSyncActionType,
} from 'lib/types/socket-types';
import type { ThreadStoreOperation } from 'lib/types/thread-types';
import { updateTypes } from 'lib/types/update-types';
import { reduxLoggerMiddleware } from 'lib/utils/action-logger';
import { setNewSessionActionType } from 'lib/utils/action-utils';
import {
  convertMessageStoreOperationsToClientDBOperations,
  translateClientDBMessageInfosToRawMessageInfos,
} from 'lib/utils/message-ops-utils';
import { convertThreadStoreOperationsToClientDBOperations } from 'lib/utils/thread-ops-utils';

import { defaultNavInfo } from '../navigation/default-state';
import { getGlobalNavContext } from '../navigation/icky-global';
import { activeMessageListSelector } from '../navigation/nav-selectors';
import { defaultNotifPermissionAlertInfo } from '../push/alerts';
import { reduceThreadIDsToNotifIDs } from '../push/reducer';
import reactotron from '../reactotron';
import { defaultDeviceCameraInfo } from '../types/camera';
import { defaultConnectivityInfo } from '../types/connectivity';
import { defaultGlobalThemeInfo } from '../types/themes';
import {
  defaultURLPrefix,
  natNodeServer,
  setCustomServer,
  getDevServerHostname,
} from '../utils/url-utils';
import {
  resetUserStateActionType,
  recordNotifPermissionAlertActionType,
  recordAndroidNotificationActionType,
  clearAndroidNotificationsActionType,
  rescindAndroidNotificationActionType,
  updateDimensionsActiveType,
  updateConnectivityActiveType,
  updateThemeInfoActionType,
  updateDeviceCameraInfoActionType,
  updateDeviceOrientationActionType,
  updateThreadLastNavigatedActionType,
  backgroundActionTypes,
  setReduxStateActionType,
  type Action,
} from './action-types';
import { remoteReduxDevServerConfig } from './dev-tools';
import { defaultDimensionsInfo } from './dimensions-updater.react';
import { persistConfig, setPersistor } from './persist';
import type { AppState } from './state-types';

const defaultState = ({
  navInfo: defaultNavInfo,
  currentUserInfo: null,
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
  updatesCurrentAsOf: 0,
  loadingStatuses: {},
  calendarFilters: defaultCalendarFilters,
  cookie: null,
  deviceToken: null,
  dataLoaded: false,
  urlPrefix: defaultURLPrefix,
  customServer: natNodeServer,
  threadIDsToNotifIDs: {},
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
}: AppState);

function reducer(state: AppState = defaultState, action: Action) {
  if (action.type === setReduxStateActionType) {
    return action.payload.state;
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
        action.payload.source,
      )) ||
    (action.type === logInActionTypes.success &&
      invalidSessionRecovery(
        state,
        action.payload.currentUserInfo,
        action.payload.source,
      ))
  ) {
    return state;
  }

  const threadIDsToNotifIDs = reduceThreadIDsToNotifIDs(
    state.threadIDsToNotifIDs,
    action,
  );
  state = { ...state, threadIDsToNotifIDs };
  if (
    action.type === recordAndroidNotificationActionType ||
    action.type === clearAndroidNotificationsActionType ||
    action.type === rescindAndroidNotificationActionType
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

  const baseReducerResult = baseReducer(state, (action: BaseAction));
  state = baseReducerResult.state;

  const { storeOperations } = baseReducerResult;
  const { threadStoreOperations, messageStoreOperations } = storeOperations;

  const fixUnreadActiveThreadResult = fixUnreadActiveThread(state, action);
  state = fixUnreadActiveThreadResult.state;

  const threadStoreOperationsWithUnreadFix = [
    ...threadStoreOperations,
    ...fixUnreadActiveThreadResult.threadStoreOperations,
  ];

  const convertedThreadStoreOperations = convertThreadStoreOperationsToClientDBOperations(
    threadStoreOperationsWithUnreadFix,
  );
  const convertedMessageStoreOperations = convertMessageStoreOperationsToClientDBOperations(
    messageStoreOperations,
  );

  if (convertedMessageStoreOperations.length > 0) {
    global.CommCoreModule.processMessageStoreOperationsSync(
      convertedMessageStoreOperations,
    );
  }

  const crashReportsEnabled = state.reportStore.enabledReports.crashReports;
  const viewerID = state.currentUserInfo?.id;

  try {
    const messages = global.CommCoreModule.getAllMessagesSync();
    const rawMsgsFromSQLite = translateClientDBMessageInfosToRawMessageInfos(
      messages,
    );

    const ignoreList = [
      '@@INIT',
      'persist/REHYDRATE',
      'persist/PERSIST',
      'SET_THREAD_STORE',
    ];
    if (
      !isEqual(rawMsgsFromSQLite, state.messageStore.messages) &&
      !ignoreList.includes(action.type) &&
      !action.type.includes('@@redux/INIT')
    ) {
      Alert.alert(`${action.type}: NOT EQUAL`);
    }
  } catch (e) {
    if ((__DEV__ || (viewerID && isStaff(viewerID))) && crashReportsEnabled) {
      throw e;
    }
    console.log(e.message);
  }

  (async () => {
    try {
      const promises = [];
      if (convertedThreadStoreOperations.length > 0) {
        promises.push(
          global.CommCoreModule.processThreadStoreOperations(
            convertedThreadStoreOperations,
          ),
        );
      }
      await Promise.all(promises);
    } catch {
      dispatch({
        type: setNewSessionActionType,
        payload: {
          sessionChange: {
            cookie: null,
            cookieInvalidated: false,
            currentUserInfo: state.currentUserInfo,
          },
          preRequestUserState: {
            currentUserInfo: state.currentUserInfo,
            sessionID: undefined,
            cookie: state.cookie,
          },
          error: null,
          source: sqliteOpFailure,
        },
      });
      await persistor.flush();
      ExitApp.exitApp();
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

const middlewares = [thunk, reduxLoggerMiddleware];
if (__DEV__) {
  const createDebugger = require('redux-flipper').default;
  middlewares.push(createDebugger());
}

const middleware = applyMiddleware(...middlewares);

let composeFunc = compose;
if (__DEV__ && global.HermesInternal) {
  const { composeWithDevTools } = require('remote-redux-devtools/src');
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
