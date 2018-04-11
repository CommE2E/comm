// @flow

import { type CookieSource, cookieType } from './cookies';
import type { Platform } from 'lib/types/device-types';

import invariant from 'invariant';

export type UserViewerData = {|
  +loggedIn: true,
  +id: string,
  +platform: ?Platform,
  +userID: string,
  +cookieID: string,
  +cookiePassword: string,
  +insertionTime?: ?number,
|};

export type AnonymousViewerData = {|
  +loggedIn: false,
  +id: string,
  +platform: ?Platform,
  +cookieID: string,
  +cookiePassword: string,
  +insertionTime?: ?number,
|};

export type ViewerData = UserViewerData | AnonymousViewerData;

class Viewer {

  data: ViewerData;
  cookieChanged = false;
  cookieInvalidated = false;
  initialCookieName: string;
  initializationSource: CookieSource;

  constructor(data: ViewerData, initializationSource: CookieSource) {
    this.data = data;
    this.initialCookieName = Viewer.cookieNameFromViewerData(data);
    this.initializationSource = initializationSource;
  }

  static cookieNameFromViewerData(data: ViewerData) {
    return data.loggedIn
      ? cookieType.USER
      : cookieType.ANONYMOUS;
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

  get cookieName(): string {
    return Viewer.cookieNameFromViewerData(this.data);
  }

  get cookieString(): string {
    return `${this.cookieID}:${this.cookiePassword}`;
  }

  get cookiePairString(): string {
    return `${this.cookieName}=${this.cookieString}`;
  }

  get platform(): ?Platform {
    return this.data.platform;
  }

}

export {
  Viewer,
};
