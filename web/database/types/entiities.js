// @flow

export type NullableString = {
  +value: string,
  +isNull: boolean,
};

export type ClientDBUserInfoWeb = {
  +id: string,
  +username: NullableString,
  +relationshipStatus: NullableString,
  +avatar: NullableString,
};
