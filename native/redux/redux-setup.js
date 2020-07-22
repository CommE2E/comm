// @flow

import type { ThreadStore } from 'lib/types/thread-types';
import { type EntryStore } from 'lib/types/entry-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { CurrentUserInfo, UserStore } from 'lib/types/user-types';
import type { MessageStore } from 'lib/types/message-types';
import type { PersistState } from 'redux-persist/src/types';
import {
  type NotifPermissionAlertInfo,
  defaultNotifPermissionAlertInfo,
} from '../push/alerts';
import {
  type CalendarFilter,
  defaultCalendarFilters,
} from 'lib/types/filter-types';
import { setNewSessionActionType } from 'lib/utils/action-utils';
import { updateTypes } from 'lib/types/update-types';
import { setDeviceTokenActionTypes } from 'lib/actions/device-actions';
import {
  type ConnectionInfo,
  defaultConnectionInfo,
  incrementalStateSyncActionType,
} from 'lib/types/socket-types';
import {
  type ConnectivityInfo,
  defaultConnectivityInfo,
} from '../types/connectivity';
import type { Dispatch } from 'lib/types/redux-types';
import { type GlobalThemeInfo, defaultGlobalThemeInfo } from '../types/themes';
import {
  type DeviceCameraInfo,
  defaultDeviceCameraInfo,
} from '../types/camera';
import type { Orientations } from 'react-native-orientation-locker';
import type { ClientReportCreationRequest } from 'lib/types/report-types';
import type { SetSessionPayload } from 'lib/types/session-types';

import thunk from 'redux-thunk';
import { createStore, applyMiddleware, type Store, compose } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import { AppState as NativeAppState, Platform, Alert } from 'react-native';
import Orientation from 'react-native-orientation-locker';

import baseReducer from 'lib/reducers/master-reducer';
import { reduxLoggerMiddleware } from 'lib/utils/action-logger';
import { invalidSessionDowngrade } from 'lib/shared/account-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions';

import { activeMessageListSelector } from '../navigation/nav-selectors';
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
} from './action-types';
import { type NavInfo, defaultNavInfo } from '../navigation/default-state';
import { reduceThreadIDsToNotifIDs } from '../push/reducer';
import { persistConfig, setPersistor } from './persist';
import {
  defaultURLPrefix,
  natServer,
  setCustomServer,
} from '../utils/url-utils';
import reactotron from '../reactotron';
import reduceDrafts from '../reducers/draft-reducer';
import { getGlobalNavContext } from '../navigation/icky-global';
import {
  defaultDimensionsInfo,
  type DimensionsInfo,
} from './dimensions-updater.react';

export type AppState = {|
  navInfo: NavInfo,
  currentUserInfo: ?CurrentUserInfo,
  entryStore: EntryStore,
  threadStore: ThreadStore,
  userStore: UserStore,
  messageStore: MessageStore,
  drafts: { [key: string]: string },
  updatesCurrentAsOf: number,
  loadingStatuses: { [key: string]: { [idx: number]: LoadingStatus } },
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
  cookie: ?string,
  deviceToken: ?string,
  dataLoaded: boolean,
  urlPrefix: string,
  customServer: ?string,
  threadIDsToNotifIDs: { [threadID: string]: string[] },
  notifPermissionAlertInfo: NotifPermissionAlertInfo,
  connection: ConnectionInfo,
  watchedThreadIDs: $ReadOnlyArray<string>,
  foreground: boolean,
  nextLocalID: number,
  queuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
  _persist: ?PersistState,
  sessionID?: void,
  dimensions: DimensionsInfo,
  connectivity: ConnectivityInfo,
  globalThemeInfo: GlobalThemeInfo,
  deviceCameraInfo: DeviceCameraInfo,
  deviceOrientation: Orientations,
  frozen: boolean,
|};

const defaultState = ({
  navInfo: defaultNavInfo,
  currentUserInfo: null,
  entryStore: {
    entryInfos: {},
    daysToEntries: {},
    lastUserInteractionCalendar: 0,
    inconsistencyReports: [],
  },
  threadStore: {
    threadInfos: {},
    inconsistencyReports: [],
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
  drafts: {},
  updatesCurrentAsOf: 0,
  loadingStatuses: {},
  calendarFilters: defaultCalendarFilters,
  cookie: null,
  deviceToken: null,
  dataLoaded: false,
  urlPrefix: defaultURLPrefix(),
  customServer: natServer,
  threadIDsToNotifIDs: {},
  notifPermissionAlertInfo: defaultNotifPermissionAlertInfo,
  connection: defaultConnectionInfo(Platform.OS),
  watchedThreadIDs: [],
  foreground: true,
  nextLocalID: 0,
  queuedReports: [],
  _persist: null,
  dimensions: defaultDimensionsInfo,
  connectivity: defaultConnectivityInfo,
  globalThemeInfo: defaultGlobalThemeInfo,
  deviceCameraInfo: defaultDeviceCameraInfo,
  deviceOrientation: Orientation.getInitialOrientation(),
  frozen: false,
}: AppState);

function reducer(state: AppState = defaultState, action: *) {
  if (action.type === setReduxStateActionType) {
    return action.state;
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
    action.type === recordAndroidNotificationActionType ||
    action.type === clearAndroidNotificationsActionType ||
    action.type === rescindAndroidNotificationActionType
  ) {
    return {
      ...state,
      threadIDsToNotifIDs: reduceThreadIDsToNotifIDs(
        state.threadIDsToNotifIDs,
        action,
      ),
    };
  } else if (action.type === setCustomServer) {
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
  } else if (action.type === setDeviceTokenActionTypes.started) {
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
  }

  if (action.type === setNewSessionActionType) {
    sessionInvalidationAlert(action.payload);
    state = {
      ...state,
      cookie: action.payload.sessionChange.cookie,
    };
  } else if (action.type === incrementalStateSyncActionType) {
    let wipeDeviceToken = false;
    for (let update of action.payload.updatesResult.newUpdates) {
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

  state = {
    ...baseReducer(state, action),
    drafts: reduceDrafts(state.drafts, action),
  };

  return fixUnreadActiveThread(state, action);
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
      ios: 'Testflight',
      android: 'Play Store',
    });
    Alert.alert(
      'App out of date',
      "Your app version is pretty old, and the server doesn't know how to " +
        `speak to it anymore. Please use the ${app} app to update!`,
      [{ text: 'OK' }],
    );
  } else {
    Alert.alert(
      'Session invalidated',
      "We're sorry, but your session was invalidated by the server. " +
        'Please log in again.',
      [{ text: 'OK' }],
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
function fixUnreadActiveThread(state: AppState, action: *): AppState {
  const navContext = getGlobalNavContext();
  const activeThread = activeMessageListSelector(navContext);
  if (
    activeThread &&
    (NativeAppState.currentState === 'active' ||
      (appLastBecameInactive + 10000 < Date.now() &&
        !backgroundActionTypes.has(action.type))) &&
    state.threadStore.threadInfos[activeThread] &&
    state.threadStore.threadInfos[activeThread].currentUser.unread
  ) {
    state = {
      ...state,
      threadStore: {
        ...state.threadStore,
        threadInfos: {
          ...state.threadStore.threadInfos,
          [activeThread]: {
            ...state.threadStore.threadInfos[activeThread],
            currentUser: {
              ...state.threadStore.threadInfos[activeThread].currentUser,
              unread: false,
            },
          },
        },
      },
    };
  }
  return state;
}

let appLastBecameInactive = 0;
function appBecameInactive() {
  appLastBecameInactive = Date.now();
}

const middleware = applyMiddleware(thunk, reduxLoggerMiddleware);
const composeFunc = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
  ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({ name: 'Redux' })
  : compose;
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
