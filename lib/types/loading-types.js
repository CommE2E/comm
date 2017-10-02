// @flow

import PropTypes from 'prop-types';

export type LoadingStatus = "inactive" | "loading" | "error";

export const loadingStatusPropType = PropTypes.oneOf([
  "inactive",
  "loading",
  "error",
]);

export type LoadingOptions = {|
  trackMultipleRequests?: bool,
  customKeyName?: string,
|};
export type LoadingInfo = {|
  fetchIndex: number,
  trackMultipleRequests: bool,
  customKeyName: ?string,
|};
