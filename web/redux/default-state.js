// @flow

import { defaultEnabledApps } from 'lib/types/enabled-apps.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';
import { isDev } from 'lib/utils/dev-utils.js';
import { defaultNotifPermissionAlertInfo } from 'lib/utils/push-alerts.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import type { AppState } from './redux-setup.js';

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
    inconsistencyReports: [],
  },
  messageStore: {
    messages: {},
    threads: {},
    local: {},
    currentAsOf: { [ashoatKeyserverID]: 0 },
  },
  windowActive: true,
  pushApiPublicKey: null,
  cryptoStore: {
    primaryAccount: null,
    primaryIdentityKeys: null,
    notificationAccount: null,
    notificationIdentityKeys: null,
  },
  deviceID: null,
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
        updatesCurrentAsOf: 0,
        urlPrefix: isDev
          ? 'http://localhost:3000/comm'
          : 'https://web.comm.app',
        connection: { ...defaultConnectionInfo },
        lastCommunicatedPlatformDetails: null,
      },
    },
  },
  initialStateLoaded: false,
});

export { defaultWebState };
