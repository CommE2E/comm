// @flow

import t, { type TInterface } from 'tcomb';

import {
  entryStoreValidator,
  calendarQueryValidator,
} from 'lib/types/entry-types.js';
import { inviteLinksStoreValidator } from 'lib/types/link-types.js';
import { messageStoreValidator } from 'lib/types/message-types.js';
import { threadStoreValidator } from 'lib/types/thread-types.js';
import {
  currentUserInfoValidator,
  userInfosValidator,
} from 'lib/types/user-types.js';
import type { URLInfo } from 'lib/utils/url-utils.js';
import { tShape } from 'lib/utils/validation-utils.js';
import { navInfoValidator } from 'web/types/nav-types.js';
import type {
  InitialReduxState,
  InitialKeyserverInfo,
} from 'web/types/redux-types.js';

import type { Viewer } from '../session/viewer';

const initialKeyserverInfoValidator = tShape<InitialKeyserverInfo>({
  sessionID: t.maybe(t.String),
  updatesCurrentAsOf: t.Number,
});

export const initialReduxStateValidator: TInterface<InitialReduxState> =
  tShape<InitialReduxState>({
    navInfo: navInfoValidator,
    currentUserInfo: currentUserInfoValidator,
    entryStore: entryStoreValidator,
    threadStore: threadStoreValidator,
    userInfos: userInfosValidator,
    actualizedCalendarQuery: calendarQueryValidator,
    messageStore: messageStoreValidator,
    pushApiPublicKey: t.maybe(t.String),
    dataLoaded: t.Boolean,
    commServicesAccessToken: t.Nil,
    inviteLinksStore: inviteLinksStoreValidator,
    keyserverInfo: initialKeyserverInfoValidator,
  });

/* eslint-disable no-unused-vars */
async function getInitialReduxStateResponder(
  viewer: Viewer,
  urlInfo: URLInfo,
): Promise<InitialReduxState> {
  return ({}: any);
}

export { getInitialReduxStateResponder };
