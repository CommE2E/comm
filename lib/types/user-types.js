// @flow

import t, { type TInterface } from 'tcomb';

import {
  type DefaultNotificationPayload,
  defaultNotificationPayloadValidator,
} from './account-types.js';
import { type ClientAvatar, clientAvatarValidator } from './avatar-types.js';
import {
  type UserRelationshipStatus,
  userRelationshipStatusValidator,
} from './relationship-types.js';
import type { UserInconsistencyReportCreationRequest } from './report-types.js';
import { tBool, tShape } from '../utils/validation-utils.js';

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
export const userInfoValidator: TInterface<UserInfo> = tShape<UserInfo>({
  id: t.String,
  username: t.maybe(t.String),
  relationshipStatus: t.maybe(userRelationshipStatusValidator),
  avatar: t.maybe(clientAvatarValidator),
});
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
export const oldLoggedInUserInfoValidator: TInterface<OldLoggedInUserInfo> =
  tShape<OldLoggedInUserInfo>({
    id: t.String,
    username: t.String,
    email: t.String,
    emailVerified: t.Boolean,
  });

export type LoggedInUserInfo = {
  +id: string,
  +username: string,
  +settings?: DefaultNotificationPayload,
  +avatar?: ?ClientAvatar,
};
export const loggedInUserInfoValidator: TInterface<LoggedInUserInfo> =
  tShape<LoggedInUserInfo>({
    id: t.String,
    username: t.String,
    settings: t.maybe(defaultNotificationPayloadValidator),
    avatar: t.maybe(clientAvatarValidator),
  });

export type LoggedOutUserInfo = {
  +id: string,
  +anonymous: true,
};
export const loggedOutUserInfoValidator: TInterface<LoggedOutUserInfo> =
  tShape<LoggedOutUserInfo>({ id: t.String, anonymous: tBool(true) });

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
