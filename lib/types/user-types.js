// @flow

import type { RawThreadInfo } from './thread-types';

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
