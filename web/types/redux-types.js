// @flow

import type { EntryStore, CalendarQuery } from 'lib/types/entry-types.js';
import type { InviteLinksStore } from 'lib/types/link-types.js';
import type { MessageStore } from 'lib/types/message-types.js';
import type { WebNavInfo } from 'lib/types/nav-types.js';
import type { LegacyThreadStore, ThreadStore } from 'lib/types/thread-types.js';
import type { CurrentUserInfo, UserInfos } from 'lib/types/user-types.js';
import type { URLInfo } from 'lib/utils/url-utils.js';

export type WebInitialReduxStateResponse = {
  +navInfo: WebNavInfo,
  +currentUserInfo: CurrentUserInfo,
  +entryStore: EntryStore,
  +threadStore: LegacyThreadStore,
  +userInfos: UserInfos,
  +messageStore: MessageStore,
  +pushApiPublicKey: ?string,
  +commServicesAccessToken: null,
  +inviteLinksStore: InviteLinksStore,
  +keyserverInfo: WebInitialKeyserverInfo,
};

export type InitialReduxState = {
  +navInfo: WebNavInfo,
  +currentUserInfo: CurrentUserInfo,
  +entryStore: EntryStore,
  +threadStore: ThreadStore,
  +userInfos: UserInfos,
  +messageStore: MessageStore,
  +pushApiPublicKey: ?string,
  +commServicesAccessToken: null,
  +inviteLinksStore: InviteLinksStore,
  +dataLoaded: boolean,
  +actualizedCalendarQuery: CalendarQuery,
  +keyserverInfos: { +[keyserverID: string]: WebInitialKeyserverInfo },
};

export type WebInitialKeyserverInfo = {
  +sessionID: ?string,
  +updatesCurrentAsOf: number,
};

export type ExcludedData = {
  +threadStore?: boolean,
};

export type InitialReduxStateRequest = {
  +urlInfo: URLInfo,
  +excludedData: ExcludedData,
  +clientUpdatesCurrentAsOf: number,
};
