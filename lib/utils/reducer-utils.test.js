// @flow

import { defaultNotifPermissionAlertInfo } from './push-alerts.js';
import { sanitizeStateOnIdentityActions } from './reducers-utils.js';
import { ashoatKeyserverID } from './validation-utils.js';
import { defaultWebEnabledApps } from '../types/enabled-apps.js';
import { defaultCalendarFilters } from '../types/filter-types.js';
import { defaultKeyserverInfo } from '../types/keyserver-types.js';
import { defaultGlobalThemeInfo } from '../types/theme-types.js';

describe('sanitizeStateOnIdentityActions', () => {
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
        currentAsOf: { [ashoatKeyserverID]: 0 },
      },
      windowActive: true,
      pushApiPublicKey: null,
      cryptoStore: null,
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
          [ashoatKeyserverID]: defaultKeyserverInfo('url'),
        },
      },
      threadActivityStore: {},
      initialStateLoaded: false,
      integrityStore: { threadHashes: {}, threadHashingStatus: 'starting' },
      globalThemeInfo: defaultGlobalThemeInfo,
      customServer: null,
    };
    state = {
      ...defaultState,
      globalThemeInfo: {
        activeTheme: 'light',
        preference: 'light',
        systemTheme: null,
      },
      communityPickerStore: { chat: '256|1', calendar: '256|1' },
      nextLocalID: 9,
      navInfo: {
        activeChatThreadID: null,
        startDate: '2023-02-02',
        endDate: '2023-03-02',
        tab: 'calendar',
      },
    };
  });
  it("doesn't sanitize fields named in fieldsToExcludeFromSanitization", () => {
    const fieldsToExcludeFromSanitization = [
      'globalThemeInfo',
      'communityPickerStore',
      'nextLocalID',
      'navInfo',
    ];

    expect(
      sanitizeStateOnIdentityActions(
        state,
        {
          type: 'LOG_OUT_SUCCESS',
          payload: {
            currentUserInfo: { anonymous: true },
            keyserverIDs: [],
            preRequestUserState: {
              currentUserInfo: { id: '5', username: 'hi' },
              cookiesAndSessions: {},
            },
          },
          loadingInfo: {
            fetchIndex: 0,
            trackMultipleRequests: false,
            customKeyName: null,
          },
        },
        defaultState,
        fieldsToExcludeFromSanitization,
      ),
    ).toEqual(state);
  });

  it('sanitizes fields not named in fieldsToExcludeFromSanitization', () => {
    expect(
      sanitizeStateOnIdentityActions(
        state,
        {
          type: 'LOG_OUT_SUCCESS',
          payload: {
            currentUserInfo: { anonymous: true },
            keyserverIDs: [],
            preRequestUserState: {
              currentUserInfo: { id: '5', username: 'hi' },
              cookiesAndSessions: {},
            },
          },
          loadingInfo: {
            fetchIndex: 0,
            trackMultipleRequests: false,
            customKeyName: null,
          },
        },
        defaultState,
        [],
      ),
    ).toEqual(defaultState);
  });
});
