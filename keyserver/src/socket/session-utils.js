// @flow

import invariant from 'invariant';
import t from 'tcomb';

import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import type {
  UpdateActivityResult,
  ActivityUpdate,
} from 'lib/types/activity-types.js';
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
import { hash, values } from 'lib/utils/objects.js';
import { getOlmUtility } from 'lib/utils/olm-utility.js';
import { promiseAll, ignorePromiseRejections } from 'lib/utils/promises.js';

import { createAndPersistOlmSession } from '../creators/olm-session-creator.js';
import createReport from '../creators/report-creator.js';
import { fetchEntriesForSession } from '../fetchers/entry-fetchers.js';
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
  let activityUpdates: Array<ActivityUpdate> = [];
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
        ignorePromiseRejections(
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
        await createAndPersistOlmSession(
          initialNotificationsEncryptedMessage,
          'notifications',
          viewer.cookieID,
        );
      } catch (e) {
        continue;
      }
    }
  }

  const activityUpdatePromise: Promise<?UpdateActivityResult> = (async () => {
    if (activityUpdates.length === 0) {
      return undefined;
    }
    return await activityUpdater(viewer, { updates: activityUpdates });
  })();

  const serverRequests: Array<ServerServerRequest> = [];

  const { activityUpdateResult } = await promiseAll({
    all: Promise.all(promises),
    activityUpdateResult: activityUpdatePromise,
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

  if (oldLastUpdate === 0 && viewer.sessionLastUpdated === 0) {
    // If both oldLastUpdate and viewer.sessionLastUpdated are 0, that indicates
    // either a fresh registration, or a fresh login following a policy update
    // that requires acknowledgment. In the latter case, we don't want to leave
    // oldLastUpdate as 0, as it might result in a lot of old updates being
    // downloaded. So we make sure to use Date.now() for the new session, and
    // return { sessionContinued: false } to make sure the client gets a
    // stateSyncPayloadTypes.FULL.
    await setNewSession(viewer, calendarQuery, Date.now());
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
): Promise<StateCheckResult> {
  if (status.status === 'state_validated') {
    return { sessionUpdate: { lastValidated: Date.now() } };
  } else if (status.status === 'state_check') {
    const promises = Object.fromEntries(
      values(serverStateSyncSpecs).map(spec => [
        spec.hashKey,
        (async () => {
          if (
            !hasMinCodeVersion(viewer.platformDetails, {
              native: 267,
              web: 32,
            })
          ) {
            const data = await spec.fetch(viewer);
            return hash(data);
          }
          const infosHash = await spec.fetchServerInfosHash(viewer);
          return infosHash;
        })(),
      ]),
    );
    const hashesToCheck = await promiseAll(promises);
    const checkStateRequest = {
      type: serverRequestTypes.CHECK_STATE,
      hashesToCheck,
    };
    return { checkStateRequest };
  }

  const invalidKeys = new Set(status.invalidKeys);

  const shouldFetchAll = Object.fromEntries(
    values(serverStateSyncSpecs).map(spec => [
      spec.hashKey,
      invalidKeys.has(spec.hashKey),
    ]),
  );
  const idsToFetch = Object.fromEntries(
    values(serverStateSyncSpecs)
      .filter(spec => spec.innerHashSpec?.hashKey)
      .map(spec => [spec.innerHashSpec?.hashKey, new Set<string>()]),
  );
  for (const key of invalidKeys) {
    const [innerHashKey, id] = key.split('|');
    if (innerHashKey && id) {
      idsToFetch[innerHashKey]?.add(id);
    }
  }

  const fetchPromises: { [string]: Promise<mixed> } = {};
  for (const spec of values(serverStateSyncSpecs)) {
    if (shouldFetchAll[spec.hashKey]) {
      fetchPromises[spec.hashKey] = spec.fetch(viewer);
    } else if (idsToFetch[spec.innerHashSpec?.hashKey]?.size > 0) {
      fetchPromises[spec.hashKey] = spec.fetch(
        viewer,
        idsToFetch[spec.innerHashSpec?.hashKey],
      );
    }
  }
  const fetchedData = await promiseAll(fetchPromises);

  const specPerHashKey = Object.fromEntries(
    values(serverStateSyncSpecs).map(spec => [spec.hashKey, spec]),
  );
  const specPerInnerHashKey = Object.fromEntries(
    values(serverStateSyncSpecs)
      .filter(spec => spec.innerHashSpec?.hashKey)
      .map(spec => [spec.innerHashSpec?.hashKey, spec]),
  );
  const hashesToCheck: { [string]: number } = {},
    failUnmentioned: { [string]: boolean } = {},
    stateChanges: { [string]: mixed } = {};
  for (const key of invalidKeys) {
    const spec = specPerHashKey[key];
    const innerHashKey = spec?.innerHashSpec?.hashKey;
    const isTopLevelKey = !!spec;
    if (isTopLevelKey && innerHashKey) {
      // Instead of returning all the infos, we want to narrow down and figure
      // out which infos don't match first
      const infos = fetchedData[key];
      // We have a type error here because in fact the relationship between
      // Infos and Info is not guaranteed to be like this. In particular,
      // currentUserStateSyncSpec does not match this pattern. But this code
      // doesn't fire for it because no innerHashSpec is defined
      const iterableInfos: { +[string]: mixed } = (infos: any);
      for (const infoID in iterableInfos) {
        let hashValue;
        if (
          hasMinCodeVersion(viewer.platformDetails, {
            native: 267,
            web: 32,
          })
        ) {
          // We have a type error here because Flow has no way to determine that
          // spec and infos are matched up
          hashValue = await spec.getServerInfoHash(
            (iterableInfos[infoID]: any),
          );
        } else {
          hashValue = hash(iterableInfos[infoID]);
        }
        hashesToCheck[`${innerHashKey}|${infoID}`] = hashValue;
      }
      failUnmentioned[key] = true;
    } else if (isTopLevelKey) {
      stateChanges[key] = fetchedData[key];
    } else {
      const [keyPrefix, id] = key.split('|');
      const innerSpec = specPerInnerHashKey[keyPrefix];
      const innerHashSpec = innerSpec?.innerHashSpec;
      if (!innerHashSpec || !id) {
        continue;
      }
      const infos = fetchedData[innerSpec.hashKey];
      // We have a type error here because in fact the relationship between
      // Infos and Info is not guaranteed to be like this. In particular,
      // currentUserStateSyncSpec does not match this pattern. But this code
      // doesn't fire for it because no innerHashSpec is defined
      const iterableInfos: { +[string]: mixed } = (infos: any);
      const info = iterableInfos[id];
      // We have a type error here because Flow wants us to type iterableInfos
      // in this file, but we don't have access to the parameterization of
      // innerHashSpec here
      if (!info || innerHashSpec.additionalDeleteCondition?.((info: any))) {
        if (!stateChanges[innerHashSpec.deleteKey]) {
          stateChanges[innerHashSpec.deleteKey] = [id];
        } else {
          // We have a type error here because in fact stateChanges values
          // aren't always arrays. In particular, currentUserStateSyncSpec does
          // not match this pattern. But this code doesn't fire for it because
          // no innerHashSpec is defined
          const curDeleteKeyChanges: Array<mixed> = (stateChanges[
            innerHashSpec.deleteKey
          ]: any);
          curDeleteKeyChanges.push(id);
        }
        continue;
      }
      if (!stateChanges[innerHashSpec.rawInfosKey]) {
        stateChanges[innerHashSpec.rawInfosKey] = [info];
      } else {
        // We have a type error here because in fact stateChanges values aren't
        // always arrays. In particular, currentUserStateSyncSpec does not match
        // this pattern. But this code doesn't fire for it because no
        // innerHashSpec is defined
        const curRawInfosKeyChanges: Array<mixed> = (stateChanges[
          innerHashSpec.rawInfosKey
        ]: any);
        curRawInfosKeyChanges.push(info);
      }
    }
  }

  // We have a type error here because the keys that get set on some of these
  // collections aren't statically typed when they're set. Rather, they are set
  // as arbitrary strings
  const checkStateRequest: ServerCheckStateServerRequest = ({
    type: serverRequestTypes.CHECK_STATE,
    hashesToCheck,
    failUnmentioned,
    stateChanges,
  }: any);
  if (Object.keys(hashesToCheck).length === 0) {
    return { checkStateRequest, sessionUpdate: { lastValidated: Date.now() } };
  } else {
    return { checkStateRequest };
  }
}

export { processClientResponses, initializeSession, checkState };
