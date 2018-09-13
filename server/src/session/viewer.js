// @flow

import {
  type CookieSource,
  type SessionIdentifierType,
  cookieTypes,
} from 'lib/types/session-types';
import type { Platform, PlatformDetails } from 'lib/types/device-types';

import invariant from 'invariant';

import { ServerError } from 'lib/utils/errors';

export type UserViewerData = {|
  +loggedIn: true,
  +id: string,
  +platformDetails: ?PlatformDetails,
  +deviceToken: ?string,
  +userID: string,
  +cookieID: string,
  +cookieSource?: CookieSource,
  +cookiePassword: string,
  +cookieInsertedThisRequest?: bool,
  +sessionIdentifierType?: SessionIdentifierType,
  +sessionID: ?string,
|};

export type AnonymousViewerData = {|
  +loggedIn: false,
  +id: string,
  +platformDetails: ?PlatformDetails,
  +deviceToken: ?string,
  +cookieSource?: CookieSource,
  +cookieID: string,
  +cookiePassword: string,
  +cookieInsertedThisRequest?: bool,
  +sessionIdentifierType?: SessionIdentifierType,
  +sessionID: ?string,
|};

export type ViewerData = UserViewerData | AnonymousViewerData;

class Viewer {

  data: ViewerData;
  sessionChanged = false;
  cookieInvalidated = false;
  initialCookieName: string;

  constructor(data: ViewerData) {
    invariant(
      data.cookieSource !== null && data.cookieSource !== undefined,
      "data.cookieSource passed to Viewer constructor should be set",
    );
    invariant(
      data.sessionIdentifierType !== null &&
        data.sessionIdentifierType !== undefined,
      "data.sessionIdentifierType passed to Viewer constructor should be set",
    );
    this.data = data;
    this.initialCookieName = Viewer.cookieNameFromViewerData(data);
  }

  static cookieNameFromViewerData(data: ViewerData) {
    return data.loggedIn
      ? cookieTypes.USER
      : cookieTypes.ANONYMOUS;
  }

  getData() {
    return this.data;
  }

  setNewCookie(data: ViewerData) {
    if (data.cookieSource === null || data.cookieSource === undefined) {
      if (data.loggedIn) {
        data = { ...data, cookieSource: this.cookieSource };
      } else {
        // This is a separate condition because of Flow
        data = { ...data, cookieSource: this.cookieSource };
      }
    }
    if (
      data.sessionIdentifierType === null ||
      data.sessionIdentifierType === undefined
    ) {
      if (data.loggedIn) {
        data = { ...data, sessionIdentifierType: this.sessionIdentifierType };
      } else {
        // This is a separate condition because of Flow
        data = { ...data, sessionIdentifierType: this.sessionIdentifierType };
      }
    }

    this.data = data;
    this.sessionChanged = true;
    // If the request explicitly sets a new cookie, there's no point in telling
    // the client that their old cookie is invalid. Note that clients treat
    // cookieInvalidated as a forced log-out, which isn't necessary here.
    this.cookieInvalidated = false;
  }

  setSessionID(sessionID: string) {
    if (sessionID === this.sessionID) {
      return;
    }
    this.sessionChanged = true;
    if (this.data.loggedIn) {
      this.data = { ...this.data, sessionID };
    } else {
      // This is a separate condition because of Flow
      this.data = { ...this.data, sessionID };
    }
  }

  get id(): string {
    return this.data.id;
  }

  get loggedIn(): bool {
    return this.data.loggedIn;
  }

  get cookieSource(): CookieSource {
    const { cookieSource } = this.data;
    invariant(
      cookieSource !== null && cookieSource !== undefined,
      "Viewer.cookieSource should be set",
    );
    return cookieSource;
  }

  get cookieID(): string {
    return this.data.cookieID;
  }

  get cookiePassword(): string {
    return this.data.cookiePassword;
  }

  get sessionIdentifierType(): SessionIdentifierType {
    const { sessionIdentifierType } = this.data;
    invariant(
      sessionIdentifierType !== null && sessionIdentifierType !== undefined,
      "Viewer.sessionIdentifierType should be set",
    );
    return sessionIdentifierType;
  }

  get sessionID(): ?string {
    return this.data.sessionID;
  }

  get session(): string {
    if (this.sessionID) {
      return this.sessionID;
    } else if (this.sessionID === undefined) {
      return this.cookieID;
    } else if (!this.loggedIn) {
      // If the sessionID was explicitly set to null, that means that the
      // cookieID can't be used as a unique session identifier, but for some
      // reason the client doesn't have a sessionID. This should only happen
      // when the user is logged out.
      throw new ServerError('not_logged_in');
    } else {
      // That's weird...
      throw new ServerError('unknown_error');
    }
  }

  get userID(): string {
    if (!this.data.userID) {
      throw new ServerError('not_logged_in');
    }
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

  get platformDetails(): ?PlatformDetails {
    return this.data.platformDetails;
  }

  get platform(): ?Platform {
    return this.data.platformDetails
      ? this.data.platformDetails.platform
      : null;
  }

  get deviceToken(): ?string {
    return this.data.deviceToken;
  }

}

export {
  Viewer,
};
