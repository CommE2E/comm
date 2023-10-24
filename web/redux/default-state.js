// @flow

import { defaultEnabledApps } from 'lib/types/enabled-apps.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';
import { defaultGlobalThemeInfo } from 'lib/types/theme-types.js';
import { defaultNotifPermissionAlertInfo } from 'lib/utils/push-alerts.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import type { AppState } from './redux-setup.js';

declare var keyserverURL: string;

const defaultWebState: AppState = Object.freeze({
  navInfo: {
    activeChatThreadID: null,
    startDate: '',
    endDate: '',
    tab: 'chat',
  },
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
    currentAsOf: { [ashoatKeyserverID]: 0 },
  },
  windowActive: true,
  pushApiPublicKey: null,
  cryptoStore: null,
  windowDimensions: { width: window.width, height: window.height },
  loadingStatuses: {},
  calendarFilters: defaultCalendarFilters,
  deviceToken: null,
  dataLoaded: false,
  notifPermissionAlertInfo: defaultNotifPermissionAlertInfo,
  watchedThreadIDs: [],
  lifecycleState: 'active',
  enabledApps: defaultEnabledApps,
  reportStore: {
    enabledReports: {
      crashReports: false,
      inconsistencyReports: false,
      mediaReports: false,
    },
    queuedReports: [],
  },
  nextLocalID: 0,
  _persist: null,
  userPolicies: {},
  commServicesAccessToken: null,
  inviteLinksStore: {
    links: {},
  },
  actualizedCalendarQuery: {
    startDate: '',
    endDate: '',
    filters: defaultCalendarFilters,
  },
  communityPickerStore: { chat: null, calendar: null },
  keyserverStore: {
    keyserverInfos: {
      [ashoatKeyserverID]: {
        cookie: null,
        updatesCurrentAsOf: 0,
        urlPrefix: keyserverURL,
        connection: { ...defaultConnectionInfo },
        lastCommunicatedPlatformDetails: null,
      },
    },
  },
  threadActivityStore: {},
  initialStateLoaded: false,
  integrityStore: { threadHashes: {}, threadHashingStatus: 'starting' },
  globalThemeInfo: defaultGlobalThemeInfo,
});

export { defaultWebState };
