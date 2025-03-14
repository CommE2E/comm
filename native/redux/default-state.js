// @flow

import { Platform } from 'react-native';
import Orientation from 'react-native-orientation-locker';

import { defaultAlertInfos } from 'lib/types/alert-types.js';
import { defaultEnabledApps } from 'lib/types/enabled-apps.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import { defaultKeyserverInfo } from 'lib/types/keyserver-types.js';
import { defaultGlobalThemeInfo } from 'lib/types/theme-types.js';

import { defaultDimensionsInfo } from './dimensions-updater.react.js';
import type { AppState } from './state-types.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
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
  initialStateLoaded: false,
  loadingStatuses: {},
  calendarFilters: defaultCalendarFilters,
  dataLoaded: false,
  customServer: natNodeServer,
  alertStore: {
    alertInfos: defaultAlertInfos,
    coldStartCount: 0,
  },
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
      [authoritativeKeyserverID]: defaultKeyserverInfo(
        defaultURLPrefix,
        Platform.OS,
      ),
    },
  },
  localSettings: {
    isBackupEnabled: false,
  },
  threadActivityStore: {},
  integrityStore: { threadHashes: {}, threadHashingStatus: 'starting' },
  communityStore: {
    communityInfos: {},
  },
  auxUserStore: {
    auxUserInfos: {},
  },
  dbOpsStore: {
    queuedOps: [],
  },
  syncedMetadataStore: {
    syncedMetadata: {},
  },
  tunnelbrokerDeviceToken: {
    localToken: null,
    tunnelbrokerToken: null,
  },
  queuedDMOperations: {
    threadQueue: {},
    messageQueue: {},
    entryQueue: {},
    membershipQueue: {},
    shimmedOperations: [],
  },
  holderStore: {
    storedHolders: {},
  },
  backupStore: {
    latestBackupInfo: null,
  },
}: AppState);

export { defaultState };
