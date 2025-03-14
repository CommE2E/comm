// @flow

import { authoritativeKeyserverID } from './authoritative-keyserver.js';
import { resetUserSpecificState } from './reducers-utils.js';
import { defaultAlertInfos } from '../types/alert-types.js';
import { defaultWebEnabledApps } from '../types/enabled-apps.js';
import { defaultCalendarFilters } from '../types/filter-types.js';
import { defaultKeyserverInfo } from '../types/keyserver-types.js';
import { defaultGlobalThemeInfo } from '../types/theme-types.js';

jest.mock('./config.js');

describe('resetUserSpecificState', () => {
  let defaultState;
  let state;
  beforeAll(() => {
    defaultState = {
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
        currentAsOf: { [authoritativeKeyserverID()]: 0 },
      },
      windowActive: true,
      pushApiPublicKey: null,

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
      actualizedCalendarQuery: {
        startDate: '',
        endDate: '',
        filters: defaultCalendarFilters,
      },
      communityPickerStore: { chat: null, calendar: null },
      keyserverStore: {
        keyserverInfos: {
          [authoritativeKeyserverID()]: defaultKeyserverInfo('url'),
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
        shimmedOperations: [],
      },
      holderStore: {
        storedHolders: {},
      },
    };
    state = {
      ...defaultState,
      globalThemeInfo: {
        activeTheme: 'light',
        preference: 'light',
        systemTheme: null,
      },
      communityPickerStore: { chat: '256|1', calendar: '256|1' },
      navInfo: {
        activeChatThreadID: null,
        startDate: '2023-02-02',
        endDate: '2023-03-02',
        tab: 'calendar',
      },
    };
  });
  it("doesn't reset fields named in nonUserSpecificFields", () => {
    const nonUserSpecificFields = [
      'globalThemeInfo',
      'communityPickerStore',
      'navInfo',
    ];

    expect(
      resetUserSpecificState(state, defaultState, nonUserSpecificFields),
    ).toEqual(state);
  });

  it('resets fields not named in nonUserSpecificFields', () => {
    expect(resetUserSpecificState(state, defaultState, [])).toEqual(
      defaultState,
    );
  });
});
