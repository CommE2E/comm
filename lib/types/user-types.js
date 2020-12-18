// @flow

import PropTypes from 'prop-types';

import type { UserRelationshipStatus } from './relationship-types';
import type { UserInconsistencyReportCreationRequest } from './report-types';

export type GlobalUserInfo = {|
  +id: string,
  +username: ?string,
|};

export type GlobalAccountUserInfo = {|
  +id: string,
  +username: string,
|};

export type UserInfo = {|
  +id: string,
  +username: ?string,
  +relationshipStatus?: UserRelationshipStatus,
|};
export type UserInfos = { +[id: string]: UserInfo };

export const userInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string,
  relationshipStatus: PropTypes.number,
});

export type AccountUserInfo = {|
  +id: string,
  +username: string,
  +relationshipStatus?: UserRelationshipStatus,
|};

export const accountUserInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  relationshipStatus: PropTypes.number,
});

export type UserStore = {|
  +userInfos: UserInfos,
  +inconsistencyReports: $ReadOnlyArray<UserInconsistencyReportCreationRequest>,
|};

export type RelativeUserInfo = {|
  +id: string,
  +username: ?string,
  +isViewer: boolean,
|};

export const relativeUserInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string,
  isViewer: PropTypes.bool.isRequired,
});

export type LoggedInUserInfo = {|
  +id: string,
  +username: string,
  +email: string,
  +emailVerified: boolean,
|};

export type LoggedOutUserInfo = {|
  +id: string,
  +anonymous: true,
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
  +updatedFields: {|
    +email?: ?string,
    +password?: ?string,
  |},
  +currentPassword: string,
|};

export type UserListItem = {|
  +id: string,
  +username: string,
  +disabled?: boolean,
  +notice?: string,
  +alertText?: string,
  +alertTitle?: string,
|};

export const userListItemPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  notice: PropTypes.string,
  alertText: PropTypes.string,
  alertTitle: PropTypes.string,
});
