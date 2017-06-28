// @flow

export type UserInfo = {|
  id: string,
  username: string,
|};

export type CurrentUserInfo = {|
  id: string,
  username: string,
  email: string,
  emailVerified: bool,
|};
