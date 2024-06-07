// @flow

import t, { type TInterface } from 'tcomb';

import type { AuthActionSource } from './account-types.js';
import { type CalendarQuery, calendarQueryValidator } from './entry-types.js';
import type { MixedRawThreadInfos } from './thread-types.js';
import {
  type UserInfo,
  type CurrentUserInfo,
  type LoggedOutUserInfo,
} from './user-types.js';
import { tShape } from '../utils/validation-utils.js';

export const cookieLifetime = 30 * 24 * 60 * 60 * 1000; // in milliseconds
// Interval the server waits after a state check before starting a new one
export const sessionCheckFrequency = 3 * 60 * 1000; // in milliseconds
// How long the server debounces after activity before initiating a state check
export const stateCheckInactivityActivationInterval = 3 * 1000; // in milliseconds

// On native, we use the cookieID as a unique session identifier. This is
// because there is no way to have two instances of an app running. On the other
// hand, on web it is possible to have two sessions open using the same cookie,
// so we have a unique sessionID specified in the request body.
export const sessionIdentifierTypes = Object.freeze({
  COOKIE_ID: 0,
  BODY_SESSION_ID: 1,
});
export type SessionIdentifierType = $Values<typeof sessionIdentifierTypes>;

export const cookieTypes = Object.freeze({
  USER: 'user',
  ANONYMOUS: 'anonymous',
});
export type CookieType = $Values<typeof cookieTypes>;

export type ServerSessionChange =
  | {
      cookieInvalidated: false,
      threadInfos: MixedRawThreadInfos,
      userInfos: $ReadOnlyArray<UserInfo>,
      sessionID?: null | string,
      cookie?: string,
    }
  | {
      cookieInvalidated: true,
      threadInfos: MixedRawThreadInfos,
      userInfos: $ReadOnlyArray<UserInfo>,
      currentUserInfo: LoggedOutUserInfo,
      sessionID?: null | string,
      cookie?: string,
    };

export type ClientSessionChange =
  | {
      +cookieInvalidated: false,
      +currentUserInfo?: ?CurrentUserInfo,
      +sessionID?: null | string,
      +cookie?: string,
    }
  | {
      +cookieInvalidated: true,
      +currentUserInfo: LoggedOutUserInfo,
      +sessionID?: null | string,
      +cookie?: null | string,
    };

export const genericCookieInvalidation: ClientSessionChange = {
  cookieInvalidated: true,
  currentUserInfo: { anonymous: true },
  sessionID: null,
  cookie: null,
};

export type PreRequestUserKeyserverSessionInfo = {
  +cookie: ?string,
  +sessionID: ?string,
};

export type PreRequestUserState = {
  +currentUserInfo: ?CurrentUserInfo,
  +cookiesAndSessions: {
    +[keyserverID: string]: PreRequestUserKeyserverSessionInfo,
  },
};

export type IdentityCallPreRequestUserState = $ReadOnly<{
  ...PreRequestUserState,
  +commServicesAccessToken: ?string,
}>;

export type SetSessionPayload = {
  +sessionChange: ClientSessionChange,
  +preRequestUserState: ?PreRequestUserState,
  +error: ?string,
  +authActionSource: ?AuthActionSource,
  +keyserverID: string,
};

export type SessionState = {
  +calendarQuery: CalendarQuery,
  +messagesCurrentAsOf: number,
  +updatesCurrentAsOf: number,
  +watchedIDs: $ReadOnlyArray<string>,
};

export const sessionStateValidator: TInterface<SessionState> = tShape({
  calendarQuery: calendarQueryValidator,
  messagesCurrentAsOf: t.Number,
  updatesCurrentAsOf: t.Number,
  watchedIDs: t.list(t.String),
});

export type SessionIdentification = Partial<{
  cookie: ?string,
  sessionID: ?string,
}>;

export type FetchPendingUpdatesInput = $ReadOnly<{
  ...SessionState,
  +keyserverID: string,
}>;
