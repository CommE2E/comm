// @flow

import { defaultAlertInfos } from 'lib/types/alert-types.js';
import { defaultWebEnabledApps } from 'lib/types/enabled-apps.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import { defaultKeyserverInfo } from 'lib/types/keyserver-types.js';
import { defaultGlobalThemeInfo } from 'lib/types/theme-types.js';

import type { AppState } from './redux-setup.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import electron from '../electron.js';

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
    currentAsOf: { [authoritativeKeyserverID]: 0 },
  },
  windowActive: true,
  pushApiPublicKey: null,
  windowDimensions: { width: window.width, height: window.height },
  loadingStatuses: {},
  calendarFilters: defaultCalendarFilters,
  dataLoaded: false,
  alertStore: {
    alertInfos: defaultAlertInfos,
    coldStartCount: 0,
  },
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
  _persist: null,
  userPolicies: {},
  commServicesAccessToken: null,
  inviteLinksStore: {
    links: {},
  },
  communityPickerStore: { chat: null, calendar: null },
  keyserverStore: {
    keyserverInfos: {
      [authoritativeKeyserverID]: defaultKeyserverInfo(
        keyserverURL,
        electron?.platform ?? 'web',
      ),
    },
  },
  threadActivityStore: {},
  initialStateLoaded: false,
  integrityStore: { threadHashes: {}, threadHashingStatus: 'starting' },
  globalThemeInfo: defaultGlobalThemeInfo,
  customServer: null,
  communityStore: {
    communityInfos: {},
  },
  dbOpsStore: {
    queuedOps: [],
  },
  syncedMetadataStore: {
    syncedMetadata: {},
  },
  auxUserStore: {
    auxUserInfos: {},
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
  },
  holderStore: {
    storedHolders: {},
  },
});

export { defaultWebState };
