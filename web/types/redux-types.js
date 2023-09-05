// @flow

import type { EntryStore, CalendarQuery } from 'lib/types/entry-types.js';
import type { InviteLinksStore } from 'lib/types/link-types.js';
import type { MessageStore } from 'lib/types/message-types.js';
import type { ThreadStore } from 'lib/types/thread-types.js';
import type { CurrentUserInfo, UserInfos } from 'lib/types/user-types.js';

import type { NavInfo } from '../types/nav-types.js';

export type InitialReduxState = {
  +navInfo: NavInfo,
  +currentUserInfo: CurrentUserInfo,
  +entryStore: EntryStore,
  +threadStore: ThreadStore,
  +userInfos: UserInfos,
  +actualizedCalendarQuery: CalendarQuery,
  +messageStore: MessageStore,
  +dataLoaded: boolean,
  +pushApiPublicKey: ?string,
  +commServicesAccessToken: null,
  +inviteLinksStore: InviteLinksStore,
  +keyserverInfo: InitialKeyserverInfo,
};

export type InitialKeyserverInfo = {
  +sessionID: ?string,
  +updatesCurrentAsOf: number,
};
