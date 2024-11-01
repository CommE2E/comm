// @flow

import _keyBy from 'lodash/fp/keyBy.js';
import t, { type TInterface } from 'tcomb';

import { baseLegalPolicies } from 'lib/facts/policies.js';
import { daysToEntriesFromEntryInfos } from 'lib/reducers/entry-reducer.js';
import { freshMessageStore } from 'lib/reducers/message-reducer.js';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils.js';
import {
  threadHasPermission,
  threadIsPending,
  parsePendingThreadID,
  createPendingThread,
} from 'lib/shared/thread-utils.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import {
  type CommunityLinks,
  type InviteLinkWithHolder,
} from 'lib/types/link-types.js';
import {
  defaultNumberPerThread,
  type MessageStore,
} from 'lib/types/message-types.js';
import type { ServerWebInitialReduxStateResponse } from 'lib/types/redux-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { type GlobalAccountUserInfo } from 'lib/types/user-types.js';
import { currentDateInTimeZone } from 'lib/utils/date-utils.js';
import { ServerError } from 'lib/utils/errors.js';
import { promiseAll } from 'lib/utils/promises.js';
import { urlInfoValidator } from 'lib/utils/url-utils.js';
import { tShape } from 'lib/utils/validation-utils.js';
import type {
  InitialReduxStateRequest,
  ExcludedData,
} from 'web/types/redux-types.js';
import { navInfoFromURL } from 'web/url-utils.js';

import { fetchEntryInfos } from '../fetchers/entry-fetchers.js';
import { fetchPrimaryInviteLinks } from '../fetchers/link-fetchers.js';
import { fetchMessageInfos } from '../fetchers/message-fetchers.js';
import { hasAnyNotAcknowledgedPolicies } from '../fetchers/policy-acknowledgment-fetchers.js';
import { fetchAccessibleThreadInfos } from '../fetchers/thread-fetchers.js';
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
  messageStore: t.maybe(t.Bool),
  threadStore: t.maybe(t.Bool),
  entryStore: t.maybe(t.Bool),
});

export const initialReduxStateRequestValidator: TInterface<InitialReduxStateRequest> =
  tShape<InitialReduxStateRequest>({
    urlInfo: urlInfoValidator,
    excludedData: excludedDataValidator,
    clientUpdatesCurrentAsOf: t.Number,
  });

async function getInitialReduxStateResponder(
  viewer: Viewer,
  request: InitialReduxStateRequest,
): Promise<ServerWebInitialReduxStateResponse> {
  const { urlInfo, excludedData, clientUpdatesCurrentAsOf } = request;

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
  const serverUpdatesCurrentAsOf = clientUpdatesCurrentAsOf
    ? clientUpdatesCurrentAsOf
    : Date.now();

  const threadInfoPromise = fetchAccessibleThreadInfos(viewer);
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
    if (excludedData.threadStore) {
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
  const finalMessageStorePromise: Promise<MessageStore> = (async () => {
    if (excludedData.messageStore) {
      return {
        messages: {},
        threads: {},
        local: {},
        currentAsOf: {},
      };
    }
    return await messageStorePromise;
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
  const finalEntryStorePromise = (async () => {
    if (excludedData.entryStore) {
      return {
        entryInfos: {},
        daysToEntries: {},
        lastUserInteractionCalendar: 0,
      };
    }
    return await entryStorePromise;
  })();
  const userInfosPromise = (async () => {
    const [userInfos, hasNotAcknowledgedPolicies] = await Promise.all([
      userInfoPromise,
      hasNotAcknowledgedPoliciesPromise,
    ]);
    return hasNotAcknowledgedPolicies ? {} : userInfos;
  })();
  const finalUserInfosPromise = (async () => {
    if (excludedData.userStore) {
      return {};
    }
    return await userInfosPromise;
  })();

  const navInfoPromise = (async () => {
    const [{ threadInfos }, currentUserInfo, userInfos, finalNavInfo] =
      await Promise.all([
        threadInfoPromise,
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
      entryStore: finalEntryStorePromise,
      threadStore: threadStorePromise,
      userInfos: finalUserInfosPromise,
      messageStore: finalMessageStorePromise,
      pushApiPublicKey: pushApiPublicKeyPromise,
      inviteLinksStore: inviteLinksStorePromise,
      keyserverInfo: keyserverInfoPromise,
    });

  return initialReduxState;
}

export { getInitialReduxStateResponder };
