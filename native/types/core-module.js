// @flow

export type SQLiteMessageInfo = {
  +id: string,
  +thread: string,
  +user: string,
  +type: string,
  +futureType: string,
  +content: string,
  +time: string,
  +creation: string,
};

export type SQLiteDraftInfo = {
  +key: string,
  +text: string,
};
