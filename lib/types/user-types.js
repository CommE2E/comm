// @flow

import type { RawThreadInfo } from './thread-types';
import type {
  CalendarQuery,
  CalendarResult,
  RawEntryInfo,
} from './entry-types';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
  GenericMessagesResult,
} from './message-types';

import PropTypes from 'prop-types';

export type UserInfo = {|
  id: string,
  username: ?string,
|};
export type UserInfos = { [id: string]: UserInfo };

export const userInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string,
});

export type AccountUserInfo = {|
  id: string,
  username: string,
|} & UserInfo;

export const accountUserInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
});

export type RelativeUserInfo = {|
  id: string,
  username: ?string,
  isViewer: bool,
|};

export const relativeUserInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string,
  isViewer: PropTypes.bool.isRequired,
});

export type LoggedInUserInfo = {|
  id: string,
  username: string,
  email: string,
  emailVerified: bool,
|};

export type LoggedOutUserInfo = {|
  id: string,
  anonymous: true,
|};

export type CurrentUserInfo = LoggedInUserInfo | LoggedOutUserInfo;

export type AccountUpdate = {|
  updatedFields: {|
    email?: ?string,
    password?: ?string,
  |},
  currentPassword: string,
|};

export type ChangeUserSettingsResult = {|
  email: ?string,
|};

export type UserListItem = {|
  id: string,
  username: string,
  memberOfParentThread: bool,
|};

export const userListItemPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  memberOfParentThread: PropTypes.bool.isRequired,
});

export type LogOutResponse = {|
  currentUserInfo: LoggedOutUserInfo,
|};

export type LogOutResult = {|
  threadInfos: {[id: string]: RawThreadInfo},
  userInfos: $ReadOnlyArray<UserInfo>,
  currentUserInfo: LoggedOutUserInfo,
|};

export type DeleteAccountRequest = {|
  password: string,
|};

export type RegisterRequest = {|
  username: string,
  email: string,
  password: string,
|};

export type RegisterResponse = {|
  id: string,
|};

export type LogInActionSource =
  | "COOKIE_INVALIDATION_RESOLUTION_ATTEMPT"
  | "APP_START_NATIVE_CREDENTIALS_AUTO_LOG_IN"
  | "APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE";
export type LogInStartingPayload = {|
  source?: LogInActionSource,
  calendarQuery?: CalendarQuery,
|};

export type LogInRequest = {|
  usernameOrEmail: string,
  password: string,
  watchedIDs: $ReadOnlyArray<string>,
  calendarQuery?: ?CalendarQuery,
|};

export type LogInResponse = {|
  currentUserInfo: LoggedInUserInfo,
  rawMessageInfos: RawMessageInfo[],
  truncationStatuses: MessageTruncationStatuses,
  serverTime: number,
  userInfos: $ReadOnlyArray<UserInfo>,
  rawEntryInfos?: ?$ReadOnlyArray<RawEntryInfo>,
|};

export type LogInResult = {|
  threadInfos: {[id: string]: RawThreadInfo},
  currentUserInfo: LoggedInUserInfo,
  messagesResult: GenericMessagesResult,
  userInfos: UserInfo[],
  calendarResult?: CalendarResult,
|};
