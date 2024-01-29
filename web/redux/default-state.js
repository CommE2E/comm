// @flow

import { defaultWebEnabledApps } from 'lib/types/enabled-apps.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import { defaultKeyserverInfo } from 'lib/types/keyserver-types.js';
import { defaultGlobalThemeInfo } from 'lib/types/theme-types.js';
import { thisMonthDates } from 'lib/utils/date-utils.js';
import { defaultNotifPermissionAlertInfo } from 'lib/utils/push-alerts.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import type { AppState } from './redux-setup.js';
import type { NavInfo } from '../types/nav-types.js';

declare var keyserverURL: string;

const defaultNavInfo: NavInfo = {
  activeChatThreadID: null,
  startDate: thisMonthDates().startDate,
  endDate: thisMonthDates().endDate,
  tab: 'chat',
};

const defaultWebState: AppState = Object.freeze({
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
    currentAsOf: { [ashoatKeyserverID]: 0 },
  },
  windowActive: true,
  pushApiPublicKey: null,
  cryptoStore: null,
  windowDimensions: { width: window.width, height: window.height },
  loadingStatuses: {},
  calendarFilters: defaultCalendarFilters,
  dataLoaded: false,
  notifPermissionAlertInfo: defaultNotifPermissionAlertInfo,
  watchedThreadIDs: [],
  lifecycleState: 'active',
  enabledApps: defaultWebEnabledApps,
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
      [ashoatKeyserverID]: defaultKeyserverInfo(keyserverURL),
    },
  },
  threadActivityStore: {},
  initialStateLoaded: false,
  integrityStore: { threadHashes: {}, threadHashingStatus: 'starting' },
  globalThemeInfo: defaultGlobalThemeInfo,
  customServer: null,
});

export { defaultWebState };
