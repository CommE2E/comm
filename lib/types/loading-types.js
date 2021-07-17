// @flow

export type LoadingStatus = 'inactive' | 'loading' | 'error';

export type LoadingOptions = {
  +trackMultipleRequests?: boolean,
  +customKeyName?: string,
};
export type LoadingInfo = {
  +fetchIndex: number,
  +trackMultipleRequests: boolean,
  +customKeyName: ?string,
};
