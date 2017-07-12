// @flow

export type UserInfo = {|
  id: string,
  username: string,
|};

export type LoggedInUserInfo = {|
  id: string,
  username: string,
  email: string,
  emailVerified: bool,
|};

export type CurrentUserInfo = LoggedInUserInfo | {|
  id: string,
  anonymous: true,
|};
