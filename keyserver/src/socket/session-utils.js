// @flow

import invariant from 'invariant';
import t from 'tcomb';
import type { TUnion } from 'tcomb';

import type { UpdateActivityResult } from 'lib/types/activity-types.js';
import type { IdentityKeysBlob } from 'lib/types/crypto-types.js';
import { isDeviceType } from 'lib/types/device-types.js';
import type {
  CalendarQuery,
  DeltaEntryInfosResponse,
} from 'lib/types/entry-types.js';
import {
  reportTypes,
  type ThreadInconsistencyReportCreationRequest,
  type EntryInconsistencyReportCreationRequest,
} from 'lib/types/report-types.js';
import {
  serverRequestTypes,
  type ThreadInconsistencyClientResponse,
  type EntryInconsistencyClientResponse,
  type ClientResponse,
  type ServerServerRequest,
  type ServerCheckStateServerRequest,
} from 'lib/types/request-types.js';
import { sessionCheckFrequency } from 'lib/types/session-types.js';
import { signedIdentityKeysBlobValidator } from 'lib/utils/crypto-utils.js';
import { hash } from 'lib/utils/objects.js';
import { promiseAll } from 'lib/utils/promises.js';
import {
  tShape,
  tPlatform,
  tPlatformDetails,
} from 'lib/utils/validation-utils.js';

import { createOlmSession } from '../creators/olm-session-creator.js';
import { saveOneTimeKeys } from '../creators/one-time-keys-creator.js';
import createReport from '../creators/report-creator.js';
import { fetchEntriesForSession } from '../fetchers/entry-fetchers.js';
import { checkIfSessionHasEnoughOneTimeKeys } from '../fetchers/key-fetchers.js';
import { activityUpdatesInputValidator } from '../responders/activity-responders.js';
import { handleAsyncPromise } from '../responders/handlers.js';
import {
  threadInconsistencyReportValidatorShape,
  entryInconsistencyReportValidatorShape,
} from '../responders/report-responders.js';
import {
  setNewSession,
  setCookiePlatform,
  setCookiePlatformDetails,
  setCookieSignedIdentityKeysBlob,
} from '../session/cookies.js';
import type { Viewer } from '../session/viewer.js';
import { serverStateSyncSpecs } from '../shared/state-sync/state-sync-specs.js';
import { activityUpdater } from '../updaters/activity-updaters.js';
import { compareNewCalendarQuery } from '../updaters/entry-updaters.js';
import type { SessionUpdate } from '../updaters/session-updaters.js';
import { getOlmUtility } from '../utils/olm-utils.js';

const clientResponseInputValidator: TUnion<ClientResponse> = t.union([
  tShape({
    type: t.irreducible(
      'serverRequestTypes.PLATFORM',
      x => x === serverRequestTypes.PLATFORM,
    ),
    platform: tPlatform,
  }),
  tShape({
    ...threadInconsistencyReportValidatorShape,
    type: t.irreducible(
      'serverRequestTypes.THREAD_INCONSISTENCY',
      x => x === serverRequestTypes.THREAD_INCONSISTENCY,
    ),
  }),
  tShape({
    ...entryInconsistencyReportValidatorShape,
    type: t.irreducible(
      'serverRequestTypes.ENTRY_INCONSISTENCY',
      x => x === serverRequestTypes.ENTRY_INCONSISTENCY,
    ),
  }),
  tShape({
    type: t.irreducible(
      'serverRequestTypes.PLATFORM_DETAILS',
      x => x === serverRequestTypes.PLATFORM_DETAILS,
    ),
    platformDetails: tPlatformDetails,
  }),
  tShape({
    type: t.irreducible(
      'serverRequestTypes.CHECK_STATE',
      x => x === serverRequestTypes.CHECK_STATE,
    ),
    hashResults: t.dict(t.String, t.Boolean),
  }),
  tShape({
    type: t.irreducible(
      'serverRequestTypes.INITIAL_ACTIVITY_UPDATES',
      x => x === serverRequestTypes.INITIAL_ACTIVITY_UPDATES,
    ),
    activityUpdates: activityUpdatesInputValidator,
  }),
  tShape({
    type: t.irreducible(
      'serverRequestTypes.MORE_ONE_TIME_KEYS',
      x => x === serverRequestTypes.MORE_ONE_TIME_KEYS,
    ),
    keys: t.list(t.String),
  }),
  tShape({
    type: t.irreducible(
      'serverRequestTypes.SIGNED_IDENTITY_KEYS_BLOB',
      x => x === serverRequestTypes.SIGNED_IDENTITY_KEYS_BLOB,
    ),
    signedIdentityKeysBlob: signedIdentityKeysBlobValidator,
  }),
  tShape({
    type: t.irreducible(
      'serverRequestTypes.INITIAL_NOTIFICATIONS_ENCRYPTED_MESSAGE',
      x => x === serverRequestTypes.INITIAL_NOTIFICATIONS_ENCRYPTED_MESSAGE,
    ),
    initialNotificationsEncryptedMessage: t.String,
  }),
]);

type StateCheckStatus =
  | { status: 'state_validated' }
  | { status: 'state_invalid', invalidKeys: $ReadOnlyArray<string> }
  | { status: 'state_check' };
type ProcessClientResponsesResult = {
  serverRequests: ServerServerRequest[],
  stateCheckStatus: ?StateCheckStatus,
  activityUpdateResult: ?UpdateActivityResult,
};
async function processClientResponses(
  viewer: Viewer,
  clientResponses: $ReadOnlyArray<ClientResponse>,
): Promise<ProcessClientResponsesResult> {
  let viewerMissingPlatform = !viewer.platform;
  const { platformDetails } = viewer;
  let viewerMissingPlatformDetails =
    !platformDetails ||
    (isDeviceType(viewer.platform) &&
      (platformDetails.codeVersion === null ||
        platformDetails.codeVersion === undefined ||
        platformDetails.stateVersion === null ||
        platformDetails.stateVersion === undefined));

  const promises = [];
  let activityUpdates = [];
  let stateCheckStatus = null;
  const clientSentPlatformDetails = clientResponses.some(
    response => response.type === serverRequestTypes.PLATFORM_DETAILS,
  );
  for (const clientResponse of clientResponses) {
    if (
      clientResponse.type === serverRequestTypes.PLATFORM &&
      !clientSentPlatformDetails
    ) {
      promises.push(setCookiePlatform(viewer, clientResponse.platform));
      viewerMissingPlatform = false;
      if (!isDeviceType(clientResponse.platform)) {
        viewerMissingPlatformDetails = false;
      }
    } else if (
      clientResponse.type === serverRequestTypes.THREAD_INCONSISTENCY
    ) {
      promises.push(recordThreadInconsistency(viewer, clientResponse));
    } else if (clientResponse.type === serverRequestTypes.ENTRY_INCONSISTENCY) {
      promises.push(recordEntryInconsistency(viewer, clientResponse));
    } else if (clientResponse.type === serverRequestTypes.PLATFORM_DETAILS) {
      promises.push(
        setCookiePlatformDetails(viewer, clientResponse.platformDetails),
      );
      viewerMissingPlatform = false;
      viewerMissingPlatformDetails = false;
    } else if (
      clientResponse.type === serverRequestTypes.INITIAL_ACTIVITY_UPDATES
    ) {
      activityUpdates = [...activityUpdates, ...clientResponse.activityUpdates];
    } else if (clientResponse.type === serverRequestTypes.CHECK_STATE) {
      const invalidKeys = [];
      for (const key in clientResponse.hashResults) {
        const result = clientResponse.hashResults[key];
        if (!result) {
          invalidKeys.push(key);
        }
      }
      stateCheckStatus =
        invalidKeys.length > 0
          ? { status: 'state_invalid', invalidKeys }
          : { status: 'state_validated' };
    } else if (clientResponse.type === serverRequestTypes.MORE_ONE_TIME_KEYS) {
      invariant(clientResponse.keys, 'keys expected in client response');
      handleAsyncPromise(saveOneTimeKeys(viewer, clientResponse.keys));
    } else if (
      clientResponse.type === serverRequestTypes.SIGNED_IDENTITY_KEYS_BLOB
    ) {
      invariant(
        clientResponse.signedIdentityKeysBlob,
        'signedIdentityKeysBlob expected in client response',
      );
      const { signedIdentityKeysBlob } = clientResponse;
      const identityKeys: IdentityKeysBlob = JSON.parse(
        signedIdentityKeysBlob.payload,
      );
      const olmUtil = getOlmUtility();
      try {
        olmUtil.ed25519_verify(
          identityKeys.primaryIdentityPublicKeys.ed25519,
          signedIdentityKeysBlob.payload,
          signedIdentityKeysBlob.signature,
        );
        handleAsyncPromise(
          setCookieSignedIdentityKeysBlob(
            viewer.cookieID,
            signedIdentityKeysBlob,
          ),
        );
      } catch (e) {
        continue;
      }
    } else if (
      clientResponse.type ===
      serverRequestTypes.INITIAL_NOTIFICATIONS_ENCRYPTED_MESSAGE
    ) {
      invariant(
        t.String.is(clientResponse.initialNotificationsEncryptedMessage),
        'initialNotificationsEncryptedMessage expected in client response',
      );
      const { initialNotificationsEncryptedMessage } = clientResponse;
      try {
        await createOlmSession(
          initialNotificationsEncryptedMessage,
          'notifications',
          viewer.cookieID,
        );
      } catch (e) {
        continue;
      }
    }
  }

  const activityUpdatePromise = (async () => {
    if (activityUpdates.length === 0) {
      return undefined;
    }
    return await activityUpdater(viewer, { updates: activityUpdates });
  })();

  const serverRequests = [];

  const checkOneTimeKeysPromise = (async () => {
    if (!viewer.loggedIn) {
      return;
    }
    const enoughOneTimeKeys = await checkIfSessionHasEnoughOneTimeKeys(
      viewer.session,
    );
    if (!enoughOneTimeKeys) {
      serverRequests.push({ type: serverRequestTypes.MORE_ONE_TIME_KEYS });
    }
  })();

  const { activityUpdateResult } = await promiseAll({
    all: Promise.all(promises),
    activityUpdateResult: activityUpdatePromise,
    checkOneTimeKeysPromise,
  });

  if (
    !stateCheckStatus &&
    viewer.loggedIn &&
    viewer.sessionLastValidated + sessionCheckFrequency < Date.now()
  ) {
    stateCheckStatus = { status: 'state_check' };
  }

  if (viewerMissingPlatform) {
    serverRequests.push({ type: serverRequestTypes.PLATFORM });
  }
  if (viewerMissingPlatformDetails) {
    serverRequests.push({ type: serverRequestTypes.PLATFORM_DETAILS });
  }
  return { serverRequests, stateCheckStatus, activityUpdateResult };
}

async function recordThreadInconsistency(
  viewer: Viewer,
  response: ThreadInconsistencyClientResponse,
): Promise<void> {
  const { type, ...rest } = response;
  const reportCreationRequest = ({
    ...rest,
    type: reportTypes.THREAD_INCONSISTENCY,
  }: ThreadInconsistencyReportCreationRequest);
  await createReport(viewer, reportCreationRequest);
}

async function recordEntryInconsistency(
  viewer: Viewer,
  response: EntryInconsistencyClientResponse,
): Promise<void> {
  const { type, ...rest } = response;
  const reportCreationRequest = ({
    ...rest,
    type: reportTypes.ENTRY_INCONSISTENCY,
  }: EntryInconsistencyReportCreationRequest);
  await createReport(viewer, reportCreationRequest);
}

type SessionInitializationResult =
  | { sessionContinued: false }
  | {
      sessionContinued: true,
      deltaEntryInfoResult: DeltaEntryInfosResponse,
      sessionUpdate: SessionUpdate,
    };
async function initializeSession(
  viewer: Viewer,
  calendarQuery: CalendarQuery,
  oldLastUpdate: number,
): Promise<SessionInitializationResult> {
  if (!viewer.loggedIn) {
    return { sessionContinued: false };
  }

  if (!viewer.hasSessionInfo) {
    // If the viewer has no session info but is logged in, that is indicative
    // of an expired / invalidated session and we should generate a new one
    await setNewSession(viewer, calendarQuery, oldLastUpdate);
    return { sessionContinued: false };
  }

  if (oldLastUpdate < viewer.sessionLastUpdated) {
    // If the client has an older last_update than the server is tracking for
    // that client, then the client either had some issue persisting its store,
    // or the user restored the client app from a backup. Either way, we should
    // invalidate the existing session, since the server has assumed that the
    // checkpoint is further along than it is on the client, and might not still
    // have all of the updates necessary to do an incremental update
    await setNewSession(viewer, calendarQuery, oldLastUpdate);
    return { sessionContinued: false };
  }

  let comparisonResult = null;
  try {
    comparisonResult = compareNewCalendarQuery(viewer, calendarQuery);
  } catch (e) {
    if (e.message !== 'unknown_error') {
      throw e;
    }
  }

  if (comparisonResult) {
    const { difference, oldCalendarQuery } = comparisonResult;
    const sessionUpdate = {
      ...comparisonResult.sessionUpdate,
      lastUpdate: oldLastUpdate,
    };
    const deltaEntryInfoResult = await fetchEntriesForSession(
      viewer,
      difference,
      oldCalendarQuery,
    );
    return { sessionContinued: true, deltaEntryInfoResult, sessionUpdate };
  } else {
    await setNewSession(viewer, calendarQuery, oldLastUpdate);
    return { sessionContinued: false };
  }
}

type StateCheckResult = {
  sessionUpdate?: SessionUpdate,
  checkStateRequest?: ServerCheckStateServerRequest,
};
async function checkState(
  viewer: Viewer,
  status: StateCheckStatus,
  calendarQuery: CalendarQuery,
): Promise<StateCheckResult> {
  const query = [calendarQuery];
  if (status.status === 'state_validated') {
    return { sessionUpdate: { lastValidated: Date.now() } };
  } else if (status.status === 'state_check') {
    const promises = {
      threadsResult: serverStateSyncSpecs.threads.fetch(viewer, query),
      entriesResult: serverStateSyncSpecs.entries.fetch(viewer, query),
      currentUserInfo: serverStateSyncSpecs.currentUser.fetch(viewer, query),
      userInfosResult: serverStateSyncSpecs.users.fetch(viewer, query),
    };
    const fetchedData = await promiseAll(promises);
    const hashesToCheck = {
      threadInfos: hash(fetchedData.threadsResult.threadInfos),
      entryInfos: hash(fetchedData.entriesResult),
      currentUserInfo: hash(fetchedData.currentUserInfo),
      userInfos: hash(fetchedData.userInfosResult),
    };
    const checkStateRequest = {
      type: serverRequestTypes.CHECK_STATE,
      hashesToCheck,
    };
    return { checkStateRequest };
  }

  const { invalidKeys } = status;

  let fetchAllThreads = false,
    fetchAllEntries = false,
    fetchAllUserInfos = false,
    fetchUserInfo = false;
  const threadIDsToFetch = new Set(),
    entryIDsToFetch = new Set(),
    userIDsToFetch = new Set();
  for (const key of invalidKeys) {
    if (key === 'threadInfos') {
      fetchAllThreads = true;
    } else if (key === 'entryInfos') {
      fetchAllEntries = true;
    } else if (key === 'userInfos') {
      fetchAllUserInfos = true;
    } else if (key === 'currentUserInfo') {
      fetchUserInfo = true;
    } else if (key.startsWith('threadInfo|')) {
      const [, threadID] = key.split('|');
      threadIDsToFetch.add(threadID);
    } else if (key.startsWith('entryInfo|')) {
      const [, entryID] = key.split('|');
      entryIDsToFetch.add(entryID);
    } else if (key.startsWith('userInfo|')) {
      const [, userID] = key.split('|');
      userIDsToFetch.add(userID);
    }
  }

  const fetchPromises = {};
  if (fetchAllThreads) {
    fetchPromises.threadsResult = serverStateSyncSpecs.threads.fetch(
      viewer,
      query,
    );
  } else if (threadIDsToFetch.size > 0) {
    fetchPromises.threadsResult = serverStateSyncSpecs.threads.fetch(
      viewer,
      query,
      threadIDsToFetch,
    );
  }
  if (fetchAllEntries) {
    fetchPromises.entryInfos = serverStateSyncSpecs.entries.fetch(
      viewer,
      query,
    );
  } else if (entryIDsToFetch.size > 0) {
    fetchPromises.entryInfos = serverStateSyncSpecs.entries.fetch(
      viewer,
      query,
      entryIDsToFetch,
    );
  }
  if (fetchAllUserInfos) {
    fetchPromises.userInfos = serverStateSyncSpecs.users.fetch(viewer, query);
  } else if (userIDsToFetch.size > 0) {
    fetchPromises.userInfos = serverStateSyncSpecs.users.fetch(
      viewer,
      query,
      userIDsToFetch,
    );
  }
  if (fetchUserInfo) {
    fetchPromises.currentUserInfo = serverStateSyncSpecs.currentUser.fetch(
      viewer,
      query,
    );
  }
  const fetchedData = await promiseAll(fetchPromises);

  const hashesToCheck = {},
    failUnmentioned = {},
    stateChanges = {};
  for (const key of invalidKeys) {
    if (key === 'threadInfos') {
      // Instead of returning all threadInfos, we want to narrow down and figure
      // out which threadInfos don't match first
      const { threadInfos } = fetchedData.threadsResult;
      for (const threadID in threadInfos) {
        hashesToCheck[`threadInfo|${threadID}`] = hash(threadInfos[threadID]);
      }
      failUnmentioned.threadInfos = true;
    } else if (key === 'entryInfos') {
      // Instead of returning all entryInfos, we want to narrow down and figure
      // out which entryInfos don't match first
      const { entryInfos } = fetchedData;
      for (const entryID in entryInfos) {
        const entryInfo = entryInfos[entryID];
        invariant(entryInfo, 'should be set');
        hashesToCheck[`entryInfo|${entryID}`] = hash(entryInfo);
      }
      failUnmentioned.entryInfos = true;
    } else if (key === 'userInfos') {
      // Instead of returning all userInfos, we want to narrow down and figure
      // out which userInfos don't match first
      const { userInfos } = fetchedData;
      for (const userID in userInfos) {
        hashesToCheck[`userInfo|${userID}`] = hash(userInfos[userID]);
      }
      failUnmentioned.userInfos = true;
    } else if (key === 'currentUserInfo') {
      stateChanges.currentUserInfo = fetchedData.currentUserInfo;
    } else if (key.startsWith('threadInfo|')) {
      const [, threadID] = key.split('|');
      const { threadInfos } = fetchedData.threadsResult;
      const threadInfo = threadInfos[threadID];
      if (!threadInfo) {
        if (!stateChanges.deleteThreadIDs) {
          stateChanges.deleteThreadIDs = [];
        }
        stateChanges.deleteThreadIDs.push(threadID);
        continue;
      }
      if (!stateChanges.rawThreadInfos) {
        stateChanges.rawThreadInfos = [];
      }
      stateChanges.rawThreadInfos.push(threadInfo);
    } else if (key.startsWith('entryInfo|')) {
      const [, entryID] = key.split('|');
      const entryInfo = fetchedData.entryInfos[entryID];
      if (!entryInfo) {
        if (!stateChanges.deleteEntryIDs) {
          stateChanges.deleteEntryIDs = [];
        }
        stateChanges.deleteEntryIDs.push(entryID);
        continue;
      }
      if (!stateChanges.rawEntryInfos) {
        stateChanges.rawEntryInfos = [];
      }
      stateChanges.rawEntryInfos.push(entryInfo);
    } else if (key.startsWith('userInfo|')) {
      const { userInfos: fetchedUserInfos } = fetchedData;
      const [, userID] = key.split('|');
      const userInfo = fetchedUserInfos[userID];
      if (!userInfo || !userInfo.username) {
        if (!stateChanges.deleteUserInfoIDs) {
          stateChanges.deleteUserInfoIDs = [];
        }
        stateChanges.deleteUserInfoIDs.push(userID);
      } else {
        if (!stateChanges.userInfos) {
          stateChanges.userInfos = [];
        }
        stateChanges.userInfos.push({
          ...userInfo,
          // Flow gets confused if we don't do this
          username: userInfo.username,
        });
      }
    }
  }

  const checkStateRequest = {
    type: serverRequestTypes.CHECK_STATE,
    hashesToCheck,
    failUnmentioned,
    stateChanges,
  };
  if (Object.keys(hashesToCheck).length === 0) {
    return { checkStateRequest, sessionUpdate: { lastValidated: Date.now() } };
  } else {
    return { checkStateRequest };
  }
}

export {
  clientResponseInputValidator,
  processClientResponses,
  initializeSession,
  checkState,
};
