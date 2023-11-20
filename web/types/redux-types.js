// @flow

import type { EntryStore, CalendarQuery } from 'lib/types/entry-types.js';
import type { InviteLinksStore } from 'lib/types/link-types.js';
import type { MessageStore } from 'lib/types/message-types.js';
import type { ThreadStore } from 'lib/types/thread-types.js';
import type { CurrentUserInfo, UserInfos } from 'lib/types/user-types.js';
import type { URLInfo } from 'lib/utils/url-utils.js';

import type { NavInfo } from '../types/nav-types.js';

export type InitialReduxStateResponse = {
  +navInfo: NavInfo,
  +currentUserInfo: CurrentUserInfo,
  +entryStore: EntryStore,
  +threadStore: ThreadStore,
  +userInfos: UserInfos,
  +messageStore: MessageStore,
  +pushApiPublicKey: ?string,
  +commServicesAccessToken: null,
  +inviteLinksStore: InviteLinksStore,
  +keyserverInfo: InitialKeyserverInfo,
};

export type InitialReduxState = {
  +navInfo: NavInfo,
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
  +keyserverInfos: { +[keyserverID: string]: InitialKeyserverInfo },
};

export type InitialKeyserverInfo = {
  +sessionID: ?string,
  +updatesCurrentAsOf: number,
};

export type ExcludedData = {
  +threadStore?: boolean,
};

export type InitialReduxStateRequest = {
  +urlInfo: URLInfo,
  +excludedData: ExcludedData,
};
