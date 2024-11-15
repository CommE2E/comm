// @flow

import t, { type TInterface } from 'tcomb';

import { mixedThinRawThreadInfoValidator } from '../../permissions/minimally-encoded-raw-thread-info-validators.js';
import { tShape, tID } from '../../utils/validation-utils.js';
import { entryStoreValidator } from '../entry-types.js';
import { inviteLinksStoreValidator } from '../link-types.js';
import { messageStoreValidator } from '../message-types.js';
import { webNavInfoValidator } from '../nav-types.js';
import type {
  WebInitialKeyserverInfo,
  ServerWebInitialReduxStateResponse,
} from '../redux-types.js';
import type { ThreadStore } from '../thread-types';
import { currentUserInfoValidator, userInfosValidator } from '../user-types.js';

const initialKeyserverInfoValidator = tShape<WebInitialKeyserverInfo>({
  sessionID: t.maybe(t.String),
  updatesCurrentAsOf: t.Number,
});

export const threadStoreValidator: TInterface<ThreadStore> =
  tShape<ThreadStore>({
    threadInfos: t.dict(tID, mixedThinRawThreadInfoValidator),
  });

export const initialReduxStateValidator: TInterface<ServerWebInitialReduxStateResponse> =
  tShape<ServerWebInitialReduxStateResponse>({
    navInfo: webNavInfoValidator,
    currentUserInfo: currentUserInfoValidator,
    entryStore: entryStoreValidator,
    threadStore: threadStoreValidator,
    userInfos: userInfosValidator,
    messageStore: messageStoreValidator,
    pushApiPublicKey: t.maybe(t.String),
    inviteLinksStore: inviteLinksStoreValidator,
    keyserverInfo: initialKeyserverInfoValidator,
  });
