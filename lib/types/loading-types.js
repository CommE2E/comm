// @flow

export type LoadingStatus = "inactive" | "loading" | "error";

export type LoadingOptions = {
  trackMultipleRequests?: bool,
};
export type LoadingInfo = {
  fetchIndex: number,
  trackMultipleRequests: bool,
};
