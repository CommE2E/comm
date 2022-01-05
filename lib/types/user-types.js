// @flow

import t, { type TInterface } from 'tcomb';

import { tShape, tBool } from '../utils/validation-utils';
import type { DefaultNotificationPayload } from './account-types';
import {
  type UserRelationshipStatus,
  userRelationshipStatusValidator,
} from './relationship-types';
import type { UserInconsistencyReportCreationRequest } from './report-types';

export type GlobalUserInfo = {
  +id: string,
  +username: ?string,
};

export type GlobalAccountUserInfo = {
  +id: string,
  +username: string,
};
export const globalAccountUserInfoValidator: TInterface = tShape({
  id: t.String,
  username: t.String,
});

export type UserInfo = {
  +id: string,
  +username: ?string,
  +relationshipStatus?: UserRelationshipStatus,
};
export const userInfoValidator: TInterface = tShape({
  id: t.String,
  username: t.maybe(t.String),
  relationshipStatus: t.maybe(userRelationshipStatusValidator),
});
export type UserInfos = { +[id: string]: UserInfo };
export const userInfosValidator: TInterface = t.dict(
  t.String,
  userInfoValidator,
);

export type AccountUserInfo = {
  +id: string,
  +username: string,
  +relationshipStatus?: UserRelationshipStatus,
};
export const accountUserInfoValidator: TInterface = tShape({
  id: t.String,
  username: t.String,
  relationshipStatus: t.maybe(userRelationshipStatusValidator),
});

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

export const oldLoggedInUserInfoValidator: TInterface = tShape({
  id: t.String,
  username: t.String,
  email: t.String,
  emailVerified: t.Boolean,
});

export type LoggedInUserInfo = {
  +id: string,
  +username: string,
  +settings?: DefaultNotificationPayload,
};
export const loggedInUserInfoValidator: TInterface = tShape({
  id: t.String,
  username: t.String,
  settings: t.maybe(
    tShape({
      default_user_notifications: t.maybe(
        t.enums.of(['focused', 'badge_only', 'background']),
      ),
    }),
  ),
});

export type LoggedOutUserInfo = {
  +id: string,
  +anonymous: true,
};
export const loggedOutUserInfoValidator: TInterface = tShape({
  id: t.String,
  anonymous: tBool(true),
});

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

export type UserPublicKeys = {
  +identityKey: string,
  +oneTimeKey?: string,
};
export const userPublicKeysValidator: TInterface = tShape({
  identityKey: t.String,
  oneTimeKey: t.maybe(t.String),
});
