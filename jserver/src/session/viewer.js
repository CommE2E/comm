// @flow

import invariant from 'invariant';

type UserViewerData = {|
  anonymous: false,
  userID: string,
  cookieID: string,
  cookiePassword: string,
|};

type AnonymousViewerData = {|
  anonymous: true,
  cookieID: string,
  cookiePassword: string,
|};

type ViewerData = UserViewerData | AnonymousViewerData;

export type UserViewer = {|
  +loggedIn: true,
  +id: string,
  +userID: string,
  +cookieID: string,
  +cookiePassword: string,
|};

type AnonymousViewer = {|
  +loggedIn: false,
  +id: string,
  +cookieID: string,
  +cookiePassword: string,
|};

export type Viewer = UserViewer | AnonymousViewer;
