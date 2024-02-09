// @flow

import { Platform } from 'react-native';
import Orientation from 'react-native-orientation-locker';

import { defaultEnabledApps } from 'lib/types/enabled-apps.js';
import { defaultCalendarQuery } from 'lib/types/entry-types.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import { defaultKeyserverInfo } from 'lib/types/keyserver-types.js';
import { defaultGlobalThemeInfo } from 'lib/types/theme-types.js';
import { authoritativeKeyserverID } from 'lib/utils/authoritative-keyserver.js';
import { defaultNotifPermissionAlertInfo } from 'lib/utils/push-alerts.js';

import { defaultDimensionsInfo } from './dimensions-updater.react.js';
import type { AppState } from './state-types.js';
import { defaultNavInfo } from '../navigation/default-state.js';
import { defaultDeviceCameraInfo } from '../types/camera.js';
import { defaultConnectivityInfo } from '../types/connectivity.js';
import { defaultURLPrefix, natNodeServer } from '../utils/url-utils.js';

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
  },
  messageStore: {
    messages: {},
    threads: {},
    local: {},
    currentAsOf: { [authoritativeKeyserverID]: 0 },
  },
  storeLoaded: false,
  loadingStatuses: {},
  calendarFilters: defaultCalendarFilters,
  dataLoaded: false,
  customServer: natNodeServer,
  notifPermissionAlertInfo: defaultNotifPermissionAlertInfo,
  actualizedCalendarQuery: defaultCalendarQuery(Platform.OS),
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
  commServicesAccessToken: null,
  inviteLinksStore: {
    links: {},
  },
  keyserverStore: {
    keyserverInfos: {
      [authoritativeKeyserverID]: defaultKeyserverInfo(defaultURLPrefix),
    },
  },
  localSettings: {
    isBackupEnabled: false,
  },
  threadActivityStore: {},
  integrityStore: { threadHashes: {}, threadHashingStatus: 'starting' },
}: AppState);

export { defaultState };
