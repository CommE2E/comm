// @flow

import type { DefaultNotificationPayload } from './account-types.js';
import type { ClientAvatar } from './avatar-types.js';
import type { UserRelationshipStatus } from './relationship-types.js';
import type { UserInconsistencyReportCreationRequest } from './report-types.js';

export type GlobalUserInfo = {
  +id: string,
  +username: ?string,
  +avatar?: ?ClientAvatar,
};

export type GlobalAccountUserInfo = {
  +id: string,
  +username: string,
  +avatar?: ?ClientAvatar,
};

export type UserInfo = {
  +id: string,
  +username: ?string,
  +relationshipStatus?: UserRelationshipStatus,
  +avatar?: ?ClientAvatar,
};
export type UserInfos = { +[id: string]: UserInfo };

export type AccountUserInfo = {
  +id: string,
  +username: string,
  +relationshipStatus?: UserRelationshipStatus,
  +avatar?: ?ClientAvatar,
};

export type UserStore = {
  +userInfos: UserInfos,
  +inconsistencyReports: $ReadOnlyArray<UserInconsistencyReportCreationRequest>,
};

export type RelativeUserInfo = {
  +id: string,
  +username: ?string,
  +isViewer: boolean,
  +avatar?: ?ClientAvatar,
};

export type OldLoggedInUserInfo = {
  +id: string,
  +username: string,
  +email: string,
  +emailVerified: boolean,
};

export type LoggedInUserInfo = {
  +id: string,
  +username: string,
  +settings?: DefaultNotificationPayload,
  +avatar?: ?ClientAvatar,
};

export type LoggedOutUserInfo = {
  +id: string,
  +anonymous: true,
};

export type OldCurrentUserInfo = OldLoggedInUserInfo | LoggedOutUserInfo;
export type CurrentUserInfo = LoggedInUserInfo | LoggedOutUserInfo;

export type PasswordUpdate = {
  +updatedFields: {
    +password?: ?string,
  },
  +currentPassword: string,
};

export type UserListItem = {
  +id: string,
  +username: string,
  +disabled?: boolean,
  +notice?: string,
  +alertText?: string,
  +alertTitle?: string,
  +avatar?: ?ClientAvatar,
};
