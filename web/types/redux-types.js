// @flow

import type { EntryStore, CalendarQuery } from 'lib/types/entry-types.js';
import type { InviteLinksStore } from 'lib/types/link-types.js';
import type { MessageStore } from 'lib/types/message-types.js';
import type { WebNavInfo } from 'lib/types/nav-types.js';
import type { WebInitialKeyserverInfo } from 'lib/types/redux-types.js';
import type { ThreadStore } from 'lib/types/thread-types.js';
import type { CurrentUserInfo, UserInfos } from 'lib/types/user-types.js';
import type { URLInfo } from 'lib/utils/url-utils.js';

export type InitialReduxState = {
  +navInfo: WebNavInfo,
  +currentUserInfo: CurrentUserInfo,
  +entryStore: EntryStore,
  +threadStore: ThreadStore,
  +userInfos: UserInfos,
  +messageStore: MessageStore,
  +pushApiPublicKey: ?string,
  +inviteLinksStore: InviteLinksStore,
  +dataLoaded: boolean,
  +actualizedCalendarQuery: CalendarQuery,
  +keyserverInfos: { +[keyserverID: string]: WebInitialKeyserverInfo },
};

export type InitialReduxStateActionPayload = $ReadOnly<{
  ...InitialReduxState,
  +threadStore?: ThreadStore,
  +userInfos?: UserInfos,
  +messageStore?: MessageStore,
  +entryStore?: EntryStore,
}>;

export type ExcludedData = {
  +userStore?: boolean,
  +messageStore?: boolean,
  +threadStore?: boolean,
  +entryStore?: boolean,
};

export type InitialReduxStateRequest = {
  +urlInfo: URLInfo,
  +excludedData: ExcludedData,
  +clientUpdatesCurrentAsOf: number,
};
