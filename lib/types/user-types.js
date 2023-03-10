// @flow

import type { DefaultNotificationPayload } from './account-types.js';
import type { AvatarDBContent } from './avatar-types';
import type { UserRelationshipStatus } from './relationship-types.js';
import type { UserInconsistencyReportCreationRequest } from './report-types.js';

export type GlobalUserInfo = {
  +id: string,
  +username: ?string,
};

export type GlobalAccountUserInfo = {
  +id: string,
  +username: string,
};

export type UserInfo = {
  +id: string,
  +username: ?string,
  +relationshipStatus?: UserRelationshipStatus,
};
export type UserInfos = { +[id: string]: UserInfo };

export type AccountUserInfo = {
  +id: string,
  +username: string,
  +relationshipStatus?: UserRelationshipStatus,
};

export type UserStore = {
  +userInfos: UserInfos,
  +inconsistencyReports: $ReadOnlyArray<UserInconsistencyReportCreationRequest>,
};

export type RelativeUserInfo = {
  +id: string,
  +username: ?string,
  +isViewer: boolean,
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
  +avatar?: AvatarDBContent,
  +settings?: DefaultNotificationPayload,
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
};
