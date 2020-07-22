// @flow

import type { UserInconsistencyReportCreationRequest } from './report-types';

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

export type UserStore = {|
  userInfos: { [id: string]: UserInfo },
  inconsistencyReports: $ReadOnlyArray<UserInconsistencyReportCreationRequest>,
|};

export type RelativeUserInfo = {|
  id: string,
  username: ?string,
  isViewer: boolean,
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
  emailVerified: boolean,
|};

export type LoggedOutUserInfo = {|
  id: string,
  anonymous: true,
|};

export type CurrentUserInfo = LoggedInUserInfo | LoggedOutUserInfo;

export const currentUserPropType = PropTypes.oneOfType([
  PropTypes.shape({
    id: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    emailVerified: PropTypes.bool.isRequired,
  }),
  PropTypes.shape({
    id: PropTypes.string.isRequired,
    anonymous: PropTypes.oneOf([true]).isRequired,
  }),
]);

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
  memberOfParentThread: boolean,
|};

export const userListItemPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  memberOfParentThread: PropTypes.bool.isRequired,
});
