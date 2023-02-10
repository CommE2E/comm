// @flow

import geoip from 'geoip-lite';
import invariant from 'invariant';

import type { Platform, PlatformDetails } from 'lib/types/device-types.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import {
  type CookieSource,
  type SessionIdentifierType,
  cookieTypes,
  type CookieType,
  sessionIdentifierTypes,
} from 'lib/types/session-types.js';
import { ServerError } from 'lib/utils/errors.js';

export type UserViewerData = {
  +loggedIn: true,
  +id: string,
  +platformDetails: ?PlatformDetails,
  +deviceToken: ?string,
  +userID: string,
  +cookieID: ?string,
  +cookieSource?: CookieSource,
  +cookiePassword: ?string,
  +cookieInsertedThisRequest?: boolean,
  +sessionIdentifierType?: SessionIdentifierType,
  +sessionID: ?string,
  +sessionInfo: ?SessionInfo,
  +isScriptViewer: boolean,
  +isSocket?: boolean,
  +ipAddress?: string,
  +userAgent?: ?string,
};

export type AnonymousViewerData = {
  +loggedIn: false,
  +id: string,
  +platformDetails: ?PlatformDetails,
  +deviceToken: ?string,
  +cookieSource?: CookieSource,
  +cookieID: string,
  +cookiePassword: ?string,
  +cookieInsertedThisRequest?: boolean,
  +sessionIdentifierType?: SessionIdentifierType,
  +sessionID: ?string,
  +sessionInfo: ?SessionInfo,
  +isScriptViewer: boolean,
  +isSocket?: boolean,
  +ipAddress?: string,
  +userAgent?: ?string,
};

type SessionInfo = {
  +lastValidated: number,
  +lastUpdate: number,
  +calendarQuery: CalendarQuery,
};

export type ViewerData = UserViewerData | AnonymousViewerData;

class Viewer {
  data: ViewerData;
  sessionChanged: boolean = false;
  cookieInvalidated: boolean = false;
  initialCookieName: string;
  cachedTimeZone: ?string;

  constructor(data: ViewerData) {
    this.data = data;
    this.initialCookieName = Viewer.cookieNameFromViewerData(data);
  }

  static cookieNameFromViewerData(data: ViewerData): CookieType {
    return data.loggedIn ? cookieTypes.USER : cookieTypes.ANONYMOUS;
  }

  getData(): ViewerData {
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
    if (data.isSocket === null || data.isSocket === undefined) {
      if (data.loggedIn) {
        data = { ...data, isSocket: this.isSocket };
      } else {
        // This is a separate condition because of Flow
        data = { ...data, isSocket: this.isSocket };
      }
    }
    if (data.ipAddress === null || data.ipAddress === undefined) {
      if (data.loggedIn) {
        data = { ...data, ipAddress: this.ipAddress };
      } else {
        // This is a separate condition because of Flow
        data = { ...data, ipAddress: this.ipAddress };
      }
    } else {
      this.cachedTimeZone = undefined;
    }
    if (data.userAgent === null || data.userAgent === undefined) {
      if (data.loggedIn) {
        data = { ...data, userAgent: this.userAgent };
      } else {
        // This is a separate condition because of Flow
        data = { ...data, userAgent: this.userAgent };
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

  setSessionInfo(sessionInfo: SessionInfo) {
    if (this.data.loggedIn) {
      this.data = { ...this.data, sessionInfo };
    } else {
      // This is a separate condition because of Flow
      this.data = { ...this.data, sessionInfo };
    }
  }

  setDeviceToken(deviceToken: string) {
    if (this.data.loggedIn) {
      this.data = { ...this.data, deviceToken };
    } else {
      // This is a separate condition because of Flow
      this.data = { ...this.data, deviceToken };
    }
  }

  setPlatformDetails(platformDetails: PlatformDetails) {
    if (this.data.loggedIn) {
      this.data = { ...this.data, platformDetails };
    } else {
      // This is a separate condition because of Flow
      this.data = { ...this.data, platformDetails };
    }
  }

  get id(): string {
    return this.data.id;
  }

  get loggedIn(): boolean {
    return this.data.loggedIn;
  }

  get cookieSource(): CookieSource {
    const { cookieSource } = this.data;
    invariant(
      cookieSource !== null && cookieSource !== undefined,
      'Viewer.cookieSource should be set',
    );
    return cookieSource;
  }

  get cookieID(): string {
    const { cookieID } = this.data;
    invariant(
      cookieID !== null && cookieID !== undefined,
      'Viewer.cookieID should be set',
    );
    return cookieID;
  }

  get cookiePassword(): string {
    const { cookiePassword } = this.data;
    invariant(
      cookiePassword !== null && cookiePassword !== undefined,
      'Viewer.cookieID should be set',
    );
    return cookiePassword;
  }

  get sessionIdentifierType(): SessionIdentifierType {
    const { sessionIdentifierType } = this.data;
    invariant(
      sessionIdentifierType !== null && sessionIdentifierType !== undefined,
      'Viewer.sessionIdentifierType should be set',
    );
    return sessionIdentifierType;
  }

  // This is used in the case of sessionIdentifierTypes.BODY_SESSION_ID only.
  // It will be falsey otherwise. Use session below if you want the actual
  // session identifier in all cases.
  get sessionID(): ?string {
    return this.data.sessionID;
  }

  get session(): string {
    if (this.sessionIdentifierType === sessionIdentifierTypes.COOKIE_ID) {
      return this.cookieID;
    } else if (this.sessionID) {
      return this.sessionID;
    } else if (!this.loggedIn) {
      throw new ServerError('not_logged_in');
    } else {
      // If the session identifier is sessionIdentifierTypes.BODY_SESSION_ID and
      // the user is logged in, then the sessionID should be set.
      throw new ServerError('unknown_error');
    }
  }

  get hasSessionInfo(): boolean {
    const { sessionInfo } = this.data;
    return !!sessionInfo;
  }

  get sessionLastValidated(): number {
    const { sessionInfo } = this.data;
    invariant(
      sessionInfo !== null && sessionInfo !== undefined,
      'Viewer.sessionInfo should be set',
    );
    return sessionInfo.lastValidated;
  }

  get sessionLastUpdated(): number {
    const { sessionInfo } = this.data;
    invariant(
      sessionInfo !== null && sessionInfo !== undefined,
      'Viewer.sessionInfo should be set',
    );
    return sessionInfo.lastUpdate;
  }

  get calendarQuery(): CalendarQuery {
    const { sessionInfo } = this.data;
    invariant(
      sessionInfo !== null && sessionInfo !== undefined,
      'Viewer.sessionInfo should be set',
    );
    return sessionInfo.calendarQuery;
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

  get isScriptViewer(): boolean {
    return this.data.isScriptViewer;
  }

  get isSocket(): boolean {
    invariant(
      this.data.isSocket !== null && this.data.isSocket !== undefined,
      'isSocket should be set',
    );
    return this.data.isSocket;
  }

  get ipAddress(): string {
    invariant(
      this.data.ipAddress !== null && this.data.ipAddress !== undefined,
      'ipAddress should be set',
    );
    return this.data.ipAddress;
  }

  get userAgent(): ?string {
    return this.data.userAgent;
  }

  get timeZone(): ?string {
    if (this.cachedTimeZone === undefined) {
      const geoData = geoip.lookup(this.ipAddress);
      this.cachedTimeZone = geoData ? geoData.timezone : null;
    }
    return this.cachedTimeZone;
  }
}

export { Viewer };
