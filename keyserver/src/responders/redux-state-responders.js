// @flow

import _keyBy from 'lodash/fp/keyBy.js';
import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { baseLegalPolicies } from 'lib/facts/policies.js';
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
import {
  entryStoreValidator,
  calendarQueryValidator,
} from 'lib/types/entry-types.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import { inviteLinksStoreValidator } from 'lib/types/link-types.js';
import {
  defaultNumberPerThread,
  messageStoreValidator,
} from 'lib/types/message-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { threadStoreValidator } from 'lib/types/thread-types.js';
import {
  currentUserInfoValidator,
  userInfosValidator,
} from 'lib/types/user-types.js';
import { currentDateInTimeZone } from 'lib/utils/date-utils.js';
import { promiseAll } from 'lib/utils/promises.js';
import type { URLInfo } from 'lib/utils/url-utils.js';
import { tShape, ashoatKeyserverID } from 'lib/utils/validation-utils.js';
import { navInfoValidator } from 'web/types/nav-types.js';
import type {
  InitialReduxState,
  InitialKeyserverInfo,
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

async function getInitialReduxStateResponder(
  viewer: Viewer,
  urlInfo: URLInfo,
): Promise<InitialReduxState> {
  const hasNotAcknowledgedPoliciesPromise = hasAnyNotAcknowledgedPolicies(
    viewer.id,
    baseLegalPolicies,
  );

  const initialNavInfoPromise = (async () => {
    let backupInfo = {
      now: currentDateInTimeZone(viewer.timeZone),
    };
    // Some user ids in selectedUserList might not exist in the userInfos
    // (e.g. they were included in the results of the user search endpoint)
    // Because of that we keep their userInfos inside the navInfo.
    if (urlInfo.selectedUserList) {
      const fetchedUserInfos = await fetchUserInfos(urlInfo.selectedUserList);
      const userInfos = {};
      for (const userID in fetchedUserInfos) {
        const userInfo = fetchedUserInfos[userID];
        if (userInfo.username) {
          userInfos[userID] = userInfo;
        }
      }
      backupInfo = { userInfos, ...backupInfo };
    }
    return navInfoFromURL(urlInfo, backupInfo);
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
  const initialTime = Date.now();

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
      await setNewSession(viewer, calendarQuery, initialTime);
    }
    return viewer.sessionID;
  })();

  const threadStorePromise = (async () => {
    const [{ threadInfos }, hasNotAcknowledgedPolicies] = await Promise.all([
      threadInfoPromise,
      hasNotAcknowledgedPoliciesPromise,
    ]);
    return { threadInfos: hasNotAcknowledgedPolicies ? {} : threadInfos };
  })();
  const messageStorePromise = (async () => {
    const [
      { threadInfos },
      { rawMessageInfos, truncationStatuses },
      hasNotAcknowledgedPolicies,
    ] = await Promise.all([
      threadInfoPromise,
      messageInfoPromise,
      hasNotAcknowledgedPoliciesPromise,
    ]);
    if (hasNotAcknowledgedPolicies) {
      return {
        messages: {},
        threads: {},
        local: {},
        currentAsOf: { [ashoatKeyserverID]: 0 },
      };
    }
    const { messageStore: freshStore } = freshMessageStore(
      rawMessageInfos,
      truncationStatuses,
      mostRecentMessageTimestamp(rawMessageInfos, initialTime),
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
      lastUserInteractionCalendar: initialTime,
    };
  })();
  const userInfosPromise = (async () => {
    const [userInfos, hasNotAcknowledgedPolicies] = await Promise.all([
      userInfoPromise,
      hasNotAcknowledgedPoliciesPromise,
    ]);
    return hasNotAcknowledgedPolicies ? {} : userInfos;
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

    if (
      finalNavInfo.activeChatThreadID &&
      threadIsPending(finalNavInfo.activeChatThreadID) &&
      finalNavInfo.pendingThread?.id !== finalNavInfo.activeChatThreadID
    ) {
      const pendingThreadData = parsePendingThreadID(
        finalNavInfo.activeChatThreadID,
      );
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
    return hasNotAcknowledgedPolicies ? 0 : initialTime;
  })();

  const pushApiPublicKeyPromise = (async () => {
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
    const links = {};
    for (const link of primaryInviteLinks) {
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

  const initialReduxState: InitialReduxState = await promiseAll({
    navInfo: navInfoPromise,
    currentUserInfo: currentUserInfoPromise,
    entryStore: entryStorePromise,
    threadStore: threadStorePromise,
    userInfos: userInfosPromise,
    actualizedCalendarQuery: calendarQueryPromise,
    messageStore: messageStorePromise,
    dataLoaded: viewer.loggedIn,
    pushApiPublicKey: pushApiPublicKeyPromise,
    commServicesAccessToken: null,
    inviteLinksStore: inviteLinksStorePromise,
    keyserverInfo: keyserverInfoPromise,
  });

  return initialReduxState;
}

export { getInitialReduxStateResponder };
