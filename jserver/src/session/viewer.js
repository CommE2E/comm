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

export type UserViewer = {
  loggedIn: true,
  id: string,
  userID: string,
  cookieID: string,
  cookiePassword: string,
};

type AnonymousViewer = {
  loggedIn: false,
  id: string,
  cookieID: string,
  cookiePassword: string,
};

export type Viewer = UserViewer | AnonymousViewer;

let viewer: ?Viewer = null;

function setCurrentViewer(data: ViewerData) {
  if (data.anonymous) {
    viewer = {
      cookieID: data.cookieID,
      cookiePassword: data.cookiePassword,
      loggedIn: false,
      id: data.cookieID,
    };
  } else {
    viewer = {
      userID: data.userID,
      cookieID: data.cookieID,
      cookiePassword: data.cookiePassword,
      loggedIn: true,
      id: data.userID,
    };
  }
}

function currentViewer(): Viewer {
  invariant(viewer, "viewer should be set");
  return viewer;
}

export {
  setCurrentViewer,
  currentViewer,
};
