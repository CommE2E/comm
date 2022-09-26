// @flow

import type { LogInActionSourceTypes } from './account-types';
import type { Shape } from './core';
import type { CalendarQuery } from './entry-types';
import type { RawThreadInfo } from './thread-types';
import {
  type UserInfo,
  type CurrentUserInfo,
  type LoggedOutUserInfo,
} from './user-types';

export const cookieLifetime = 30 * 24 * 60 * 60 * 1000; // in milliseconds
// Interval the server waits after a state check before starting a new one
export const sessionCheckFrequency = 3 * 60 * 1000; // in milliseconds
// How long the server debounces after activity before initiating a state check
export const stateCheckInactivityActivationInterval = 3 * 1000; // in milliseconds

// On native, we specify the cookie directly in the request and response body.
// We do this because:
// (1) We don't have the same XSS risks as we do on web, so there is no need to
//     prevent JavaScript from knowing the cookie password.
// (2) In the past the internal cookie logic on Android has been buggy.
//     https://github.com/facebook/react-native/issues/12956 is an example
//     issue. By specifying the cookie in the body we retain full control of how
//     that data is passed, without necessitating any native modules like
//     react-native-cookies.
export const cookieSources = Object.freeze({
  BODY: 0,
  HEADER: 1,
});
export type CookieSource = $Values<typeof cookieSources>;

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
      threadInfos: { +[id: string]: RawThreadInfo },
      userInfos: $ReadOnlyArray<UserInfo>,
      sessionID?: null | string,
      cookie?: string,
    }
  | {
      cookieInvalidated: true,
      threadInfos: { +[id: string]: RawThreadInfo },
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
      +cookie?: string,
    };

export type PreRequestUserState = {
  +currentUserInfo: ?CurrentUserInfo,
  +cookie: ?string,
  +sessionID: ?string,
};

export type SetSessionPayload = {
  sessionChange: ClientSessionChange,
  preRequestUserState: ?PreRequestUserState,
  error: ?string,
  source: ?LogInActionSourceTypes,
};

export type SessionState = {
  calendarQuery: CalendarQuery,
  messagesCurrentAsOf: number,
  updatesCurrentAsOf: number,
  watchedIDs: $ReadOnlyArray<string>,
};

export type SessionIdentification = Shape<{
  cookie: ?string,
  sessionID: ?string,
}>;

export type SessionPublicKeys = {
  +identityKey: string,
  +oneTimeKey?: string,
};
