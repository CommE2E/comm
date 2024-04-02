// @flow

import _keyBy from 'lodash/fp/keyBy.js';
import t, { type TInterface } from 'tcomb';

import { baseLegalPolicies } from 'lib/facts/policies.js';
import { mixedRawThreadInfoValidator } from 'lib/permissions/minimally-encoded-raw-thread-info-validators.js';
import { daysToEntriesFromEntryInfos } from 'lib/reducers/entry-reducer.js';
import { freshMessageStore } from 'lib/reducers/message-reducer.js';
import { mostRecentlyReadThread } from 'lib/selectors/thread-selectors.js';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils.js';
import {
  threadHasPermission,
  threadIsPending,
  parsePendingThreadID,
  createPendingThread,
} from 'lib/shared/thread-utils.js';
import { canUseDatabaseOnWeb } from 'lib/shared/web-database.js';
import { entryStoreValidator } from 'lib/types/entry-types.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import {
  inviteLinksStoreValidator,
  type CommunityLinks,
  type InviteLinkWithHolder,
} from 'lib/types/link-types.js';
import {
  defaultNumberPerThread,
  messageStoreValidator,
  type MessageStore,
} from 'lib/types/message-types.js';
import { webNavInfoValidator } from 'lib/types/nav-types.js';
import type {
  WebInitialKeyserverInfo,
  ServerWebInitialReduxStateResponse,
} from 'lib/types/redux-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { type ThreadStore } from 'lib/types/thread-types.js';
import {
  currentUserInfoValidator,
  userInfosValidator,
  type GlobalAccountUserInfo,
} from 'lib/types/user-types.js';
import { currentDateInTimeZone } from 'lib/utils/date-utils.js';
import { ServerError } from 'lib/utils/errors.js';
import { promiseAll } from 'lib/utils/promises.js';
import { urlInfoValidator } from 'lib/utils/url-utils.js';
import { tShape, tID } from 'lib/utils/validation-utils.js';
import type {
  InitialReduxStateRequest,
  ExcludedData,
} from 'web/types/redux-types.js';
import { navInfoFromURL } from 'web/url-utils.js';

import { fetchEntryInfos } from '../fetchers/entry-fetchers.js';
import { fetchPrimaryInviteLinks } from '../fetchers/link-fetchers.js';
import { fetchMessageInfos } from '../fetchers/message-fetchers.js';
import { hasAnyNotAcknowledgedPolicies } from '../fetchers/policy-acknowledgment-fetchers.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import {
  fetchCurrentUserInfo,
  fetchKnownUserInfos,
  fetchUserInfos,
} from '../fetchers/user-fetchers.js';
import { getWebPushConfig } from '../push/providers.js';
import { setNewSession } from '../session/cookies.js';
import { Viewer } from '../session/viewer.js';
import { thisKeyserverID } from '../user/identity.js';

const excludedDataValidator: TInterface<ExcludedData> = tShape<ExcludedData>({
  userStore: t.maybe(t.Bool),
  threadStore: t.maybe(t.Bool),
});

export const initialReduxStateRequestValidator: TInterface<InitialReduxStateRequest> =
  tShape<InitialReduxStateRequest>({
    urlInfo: urlInfoValidator,
    excludedData: excludedDataValidator,
    clientUpdatesCurrentAsOf: t.Number,
  });

const initialKeyserverInfoValidator = tShape<WebInitialKeyserverInfo>({
  sessionID: t.maybe(t.String),
  updatesCurrentAsOf: t.Number,
});

export const threadStoreValidator: TInterface<ThreadStore> =
  tShape<ThreadStore>({
    threadInfos: t.dict(tID, mixedRawThreadInfoValidator),
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

async function getInitialReduxStateResponder(
  viewer: Viewer,
  request: InitialReduxStateRequest,
): Promise<ServerWebInitialReduxStateResponse> {
  const { urlInfo, excludedData, clientUpdatesCurrentAsOf } = request;
  const useDatabase = viewer.loggedIn && canUseDatabaseOnWeb(viewer.userID);

  const hasNotAcknowledgedPoliciesPromise = hasAnyNotAcknowledgedPolicies(
    viewer.id,
    baseLegalPolicies,
  );

  const initialNavInfoPromise = (async () => {
    try {
      let backupInfo = {
        now: currentDateInTimeZone(viewer.timeZone),
      };
      // Some user ids in selectedUserList might not exist in the userInfos
      // (e.g. they were included in the results of the user search endpoint)
      // Because of that we keep their userInfos inside the navInfo.
      if (urlInfo.selectedUserList) {
        const fetchedUserInfos = await fetchUserInfos(urlInfo.selectedUserList);
        const userInfos: { [string]: GlobalAccountUserInfo } = {};
        for (const userID in fetchedUserInfos) {
          const userInfo = fetchedUserInfos[userID];
          if (userInfo.username) {
            userInfos[userID] = {
              ...userInfo,
              username: userInfo.username,
            };
          }
        }
        backupInfo = { userInfos, ...backupInfo };
      }
      return navInfoFromURL(urlInfo, backupInfo);
    } catch (e) {
      throw new ServerError(e.message);
    }
  })();

  const calendarQueryPromise = (async () => {
    const initialNavInfo = await initialNavInfoPromise;
    return {
      startDate: initialNavInfo.startDate,
      endDate: initialNavInfo.endDate,
      filters: defaultCalendarFilters,
    };
  })();
  const messageSelectionCriteria = { joinedThreads: true };
  const serverUpdatesCurrentAsOf =
    useDatabase && clientUpdatesCurrentAsOf
      ? clientUpdatesCurrentAsOf
      : Date.now();

  const threadInfoPromise = fetchThreadInfos(viewer);
  const messageInfoPromise = fetchMessageInfos(
    viewer,
    messageSelectionCriteria,
    defaultNumberPerThread,
  );
  const entryInfoPromise = (async () => {
    const calendarQuery = await calendarQueryPromise;
    return await fetchEntryInfos(viewer, [calendarQuery]);
  })();
  const currentUserInfoPromise = fetchCurrentUserInfo(viewer);
  const userInfoPromise = fetchKnownUserInfos(viewer);

  const sessionIDPromise = (async () => {
    const calendarQuery = await calendarQueryPromise;
    if (viewer.loggedIn) {
      await setNewSession(viewer, calendarQuery, serverUpdatesCurrentAsOf);
    }
    return viewer.sessionID;
  })();

  const threadStorePromise = (async () => {
    if (excludedData.threadStore && useDatabase) {
      return { threadInfos: {} };
    }
    const [{ threadInfos }, hasNotAcknowledgedPolicies] = await Promise.all([
      threadInfoPromise,
      hasNotAcknowledgedPoliciesPromise,
    ]);
    return { threadInfos: hasNotAcknowledgedPolicies ? {} : threadInfos };
  })();
  const messageStorePromise: Promise<MessageStore> = (async () => {
    const [
      { threadInfos },
      { rawMessageInfos, truncationStatuses },
      hasNotAcknowledgedPolicies,
      keyserverID,
    ] = await Promise.all([
      threadInfoPromise,
      messageInfoPromise,
      hasNotAcknowledgedPoliciesPromise,
      thisKeyserverID(),
    ]);
    if (hasNotAcknowledgedPolicies) {
      return {
        messages: {},
        threads: {},
        local: {},
        currentAsOf: { [keyserverID]: 0 },
      };
    }
    const { messageStore: freshStore } = freshMessageStore(
      rawMessageInfos,
      truncationStatuses,
      {
        [keyserverID]: mostRecentMessageTimestamp(
          rawMessageInfos,
          serverUpdatesCurrentAsOf,
        ),
      },
      threadInfos,
    );
    return freshStore;
  })();
  const entryStorePromise = (async () => {
    const [{ rawEntryInfos }, hasNotAcknowledgedPolicies] = await Promise.all([
      entryInfoPromise,
      hasNotAcknowledgedPoliciesPromise,
    ]);
    if (hasNotAcknowledgedPolicies) {
      return {
        entryInfos: {},
        daysToEntries: {},
        lastUserInteractionCalendar: 0,
      };
    }
    return {
      entryInfos: _keyBy('id')(rawEntryInfos),
      daysToEntries: daysToEntriesFromEntryInfos(rawEntryInfos),
      lastUserInteractionCalendar: serverUpdatesCurrentAsOf,
    };
  })();
  const userInfosPromise = (async () => {
    const [userInfos, hasNotAcknowledgedPolicies] = await Promise.all([
      userInfoPromise,
      hasNotAcknowledgedPoliciesPromise,
    ]);
    return hasNotAcknowledgedPolicies ? {} : userInfos;
  })();
  const finalUserInfosPromise = (async () => {
    if (excludedData.userStore && useDatabase) {
      return {};
    }
    return await userInfosPromise;
  })();

  const navInfoPromise = (async () => {
    const [
      { threadInfos },
      messageStore,
      currentUserInfo,
      userInfos,
      finalNavInfo,
    ] = await Promise.all([
      threadInfoPromise,
      messageStorePromise,
      currentUserInfoPromise,
      userInfosPromise,
      initialNavInfoPromise,
    ]);

    const requestedActiveChatThreadID = finalNavInfo.activeChatThreadID;
    if (
      requestedActiveChatThreadID &&
      !threadIsPending(requestedActiveChatThreadID) &&
      !threadHasPermission(
        threadInfos[requestedActiveChatThreadID],
        threadPermissions.VISIBLE,
      )
    ) {
      finalNavInfo.activeChatThreadID = null;
    }

    if (!finalNavInfo.activeChatThreadID) {
      const mostRecentThread = mostRecentlyReadThread(
        messageStore,
        threadInfos,
      );
      if (mostRecentThread) {
        finalNavInfo.activeChatThreadID = mostRecentThread;
      }
    }

    const curActiveChatThreadID = finalNavInfo.activeChatThreadID;
    if (
      curActiveChatThreadID &&
      threadIsPending(curActiveChatThreadID) &&
      finalNavInfo.pendingThread?.id !== curActiveChatThreadID
    ) {
      const pendingThreadData = parsePendingThreadID(curActiveChatThreadID);
      if (
        pendingThreadData &&
        pendingThreadData.threadType !== threadTypes.SIDEBAR &&
        currentUserInfo.id
      ) {
        const members = [...pendingThreadData.memberIDs, currentUserInfo.id]
          .map(id => {
            const userInfo = userInfos[id];
            if (!userInfo || !userInfo.username) {
              return undefined;
            }
            const { username } = userInfo;
            return { id, username };
          })
          .filter(Boolean);
        const newPendingThread = createPendingThread({
          viewerID: currentUserInfo.id,
          threadType: pendingThreadData.threadType,
          members,
        });
        finalNavInfo.activeChatThreadID = newPendingThread.id;
        finalNavInfo.pendingThread = newPendingThread;
      }
    }

    return finalNavInfo;
  })();
  const currentAsOfPromise = (async () => {
    const hasNotAcknowledgedPolicies = await hasNotAcknowledgedPoliciesPromise;
    return hasNotAcknowledgedPolicies ? 0 : serverUpdatesCurrentAsOf;
  })();

  const pushApiPublicKeyPromise: Promise<?string> = (async () => {
    const pushConfig = await getWebPushConfig();
    if (!pushConfig) {
      if (process.env.NODE_ENV !== 'development') {
        console.warn('keyserver/secrets/web_push_config.json should exist');
      }
      return null;
    }
    return pushConfig.publicKey;
  })();

  const inviteLinksStorePromise = (async () => {
    const primaryInviteLinks = await fetchPrimaryInviteLinks(viewer);
    const links: { [string]: CommunityLinks } = {};
    for (const {
      blobHolder,
      ...link
    }: InviteLinkWithHolder of primaryInviteLinks) {
      if (link.primary) {
        links[link.communityID] = {
          primaryLink: link,
        };
      }
    }
    return {
      links,
    };
  })();

  const keyserverInfoPromise = (async () => {
    const { sessionID, updatesCurrentAsOf } = await promiseAll({
      sessionID: sessionIDPromise,
      updatesCurrentAsOf: currentAsOfPromise,
    });

    return {
      sessionID,
      updatesCurrentAsOf,
    };
  })();

  const initialReduxState: ServerWebInitialReduxStateResponse =
    await promiseAll({
      navInfo: navInfoPromise,
      currentUserInfo: currentUserInfoPromise,
      entryStore: entryStorePromise,
      threadStore: threadStorePromise,
      userInfos: finalUserInfosPromise,
      messageStore: messageStorePromise,
      pushApiPublicKey: pushApiPublicKeyPromise,
      inviteLinksStore: inviteLinksStorePromise,
      keyserverInfo: keyserverInfoPromise,
    });

  return initialReduxState;
}

export { getInitialReduxStateResponder };
