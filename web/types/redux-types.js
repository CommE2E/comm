// @flow

import type { EntryStore } from 'lib/types/entry-types.js';
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
  +commServicesAccessToken: null,
  +inviteLinksStore: InviteLinksStore,
  +dataLoaded: boolean,
  +keyserverInfos: { +[keyserverID: string]: WebInitialKeyserverInfo },
};

export type ExcludedData = {
  +threadStore?: boolean,
};

export type InitialReduxStateRequest = {
  +urlInfo: URLInfo,
  +excludedData: ExcludedData,
  +clientUpdatesCurrentAsOf: number,
};
