// @flow

import PropTypes from 'prop-types';

export type UserInfo = {|
  id: string,
  username: ?string,
|};

export const userInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string,
});

export type AccountUserInfo = {|
  id: string,
  username: string,
|};

export const accountUserInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
});

export type RelativeUserInfo = {|
  id: string,
  username: ?string,
  isViewer: bool,
|};

export const relativeUserInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  username: PropTypes.string,
  isViewer: PropTypes.bool.isRequired,
});

export type LoggedInUserInfo = {|
  id: string,
  username: string,
  email: string,
  emailVerified: bool,
|};

export type LoggedOutUserInfo = {|
  id: string,
  anonymous: true,
|};

export type CurrentUserInfo = LoggedInUserInfo | LoggedOutUserInfo;
