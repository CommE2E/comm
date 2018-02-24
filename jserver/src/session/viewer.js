// @flow

import type { CookieSource } from './cookies';

import invariant from 'invariant';

export type UserViewerData = {|
  +loggedIn: true,
  +id: string,
  +userID: string,
  +cookieID: string,
  +cookiePassword: string,
|};

type AnonymousViewerData = {|
  +loggedIn: false,
  +id: string,
  +cookieID: string,
  +cookiePassword: string,
|};

type ViewerData = UserViewerData | AnonymousViewerData;

class Viewer {

  data: ViewerData;
  cookieChanged = false;
  cookieInvalidated = false;
  initializationSource: CookieSource;

  constructor(data: ViewerData, initializationSource: CookieSource) {
    this.data = data;
    this.initializationSource = initializationSource;
  }

  getData() {
    return this.data;
  }

  setNewCookie(data: ViewerData) {
    this.data = data;
    this.cookieChanged = true;
  }

  invalidateCookie(data: ViewerData) {
    this.setNewCookie(data);
    this.cookieInvalidated = true;
  }

  get id(): string {
    return this.data.id;
  }

  get loggedIn(): bool {
    return this.data.loggedIn;
  }

  get cookieID(): string {
    return this.data.cookieID;
  }

  get cookiePassword(): string {
    return this.data.cookiePassword;
  }

  get userID(): string {
    invariant(this.data.userID, "should be set");
    return this.data.userID;
  }

}

export {
  Viewer,
};
