// @flow

import type { WebSocket } from 'ws';
import type { $Request } from 'express';
import {
  type ClientSocketMessage,
  type InitialClientSocketMessage,
  type StateSyncFullSocketPayload,
  type ServerSocketMessage,
  type ErrorServerSocketMessage,
  type AuthErrorServerSocketMessage,
  clientSocketMessageTypes,
  stateSyncPayloadTypes,
  serverSocketMessageTypes,
} from 'lib/types/socket-types';
import { cookieSources } from 'lib/types/session-types';
import { defaultNumberPerThread } from 'lib/types/message-types';

import t from 'tcomb';
import invariant from 'invariant';

import { ServerError } from 'lib/utils/errors';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils';
import { mostRecentUpdateTimestamp } from 'lib/shared/update-utils';
import { promiseAll } from 'lib/utils/promises';
import { values } from 'lib/utils/objects';

import { Viewer } from './session/viewer';
import {
  checkInputValidator,
  checkClientSupported,
  tShape,
} from './utils/validation-utils';
import {
  newEntryQueryInputValidator,
  verifyCalendarQueryThreadIDs,
} from './responders/entry-responders';
import {
  clientResponseInputValidator,
  processClientResponses,
  initializeSession,
  checkState,
} from './responders/ping-responders';
import { assertSecureRequest } from './utils/security-utils';
import { fetchViewerForSocket, extendCookieLifespan } from './session/cookies';
import { fetchMessageInfosSince } from './fetchers/message-fetchers';
import { fetchThreadInfos } from './fetchers/thread-fetchers';
import { fetchEntryInfos } from './fetchers/entry-fetchers';
import { fetchCurrentUserInfo } from './fetchers/user-fetchers';
import { updateActivityTime } from './updaters/activity-updaters';
import {
  deleteUpdatesBeforeTimeTargettingSession,
} from './deleters/update-deleters';
import { fetchUpdateInfos } from './fetchers/update-fetchers';
import { commitSessionUpdate } from './updaters/session-updaters';
import { handleAsyncPromise } from './responders/handlers';
import { deleteCookie } from './deleters/cookie-deleters';
import { createNewAnonymousCookie } from './session/cookies';

const clientSocketMessageInputValidator = tShape({
  type: t.irreducible(
    'clientSocketMessageTypes.INITIAL',
    x => x === clientSocketMessageTypes.INITIAL,
  ),
  id: t.Number,
  payload: tShape({
    sessionIdentification: tShape({
      cookie: t.maybe(t.String),
      sessionID: t.maybe(t.String),
    }),
    sessionState: tShape({
      calendarQuery: newEntryQueryInputValidator,
      messagesCurrentAsOf: t.Number,
      updatesCurrentAsOf: t.Number,
      watchedIDs: t.list(t.String),
    }),
    clientResponses: t.list(clientResponseInputValidator),
  }),
});

type SendMessageFunc = (message: ServerSocketMessage) => void;

function onConnection(ws: WebSocket, req: $Request) {
  assertSecureRequest(req);
  let viewer;
  const sendMessage = (message: ServerSocketMessage) => {
    ws.send(JSON.stringify(message));
  };
  ws.on('message', async messageString => {
    let clientSocketMessage: ?ClientSocketMessage;
    try {
      const message = JSON.parse(messageString);
      checkInputValidator(clientSocketMessageInputValidator, message);
      clientSocketMessage = message;
      if (clientSocketMessage.type === clientSocketMessageTypes.INITIAL) {
        if (viewer) {
          // This indicates that the user sent multiple INITIAL messages.
          throw new ServerError('socket_already_initialized');
        }
        viewer = await fetchViewerForSocket(req, clientSocketMessage);
        if (!viewer) {
          // This indicates that the cookie was invalid, but the client is using
          // cookieSources.HEADER and thus can't accept a new cookie over
          // WebSockets. See comment under catch block for socket_deauthorized.
          throw new ServerError('socket_deauthorized');
        }
      }
      if (!viewer) {
        // This indicates a non-INITIAL message was sent by the client before
        // the INITIAL message.
        throw new ServerError('socket_uninitialized');
      }
      if (viewer.sessionChanged) {
        // This indicates that the cookie was invalid, and we've assigned a new
        // anonymous one.
        throw new ServerError('socket_deauthorized');
      }
      if (!viewer.loggedIn) {
        // This indicates that the specified cookie was an anonymous one.
        throw new ServerError('not_logged_in');
      }
      await checkClientSupported(
        viewer,
        clientSocketMessageInputValidator,
        clientSocketMessage,
      );
      const serverResponses = await handleClientSocketMessage(
        viewer,
        clientSocketMessage,
      );
      if (viewer.sessionChanged) {
        // This indicates that something has caused the session to change, which
        // shouldn't happen from inside a WebSocket since we can't handle cookie
        // invalidation.
        throw new ServerError('session_mutated_from_socket');
      }
      handleAsyncPromise(extendCookieLifespan(viewer.cookieID));
      for (let response of serverResponses) {
        sendMessage(response);
      }
    } catch (error) {
      console.warn(error);
      if (!(error instanceof ServerError)) {
        const errorMessage: ErrorServerSocketMessage = {
          type: serverSocketMessageTypes.ERROR,
          message: error.message,
        };
        const responseTo = clientSocketMessage ? clientSocketMessage.id : null;
        if (responseTo !== null) {
          errorMessage.responseTo = responseTo;
        }
        sendMessage(errorMessage);
        return;
      }
      invariant(clientSocketMessage, "should be set");
      const responseTo = clientSocketMessage.id;
      if (error.message === "socket_deauthorized") {
        const authErrorMessage: AuthErrorServerSocketMessage = {
          type: serverSocketMessageTypes.AUTH_ERROR,
          responseTo,
          message: error.message,
        }
        if (viewer) {
          // viewer should only be falsey for cookieSources.HEADER (web)
          // clients. Usually if the cookie is invalid we construct a new
          // anonymous Viewer with a new cookie, and then pass the cookie down
          // in the error. But we can't pass HTTP cookies in WebSocket messages.
          authErrorMessage.sessionChange = {
            cookie: viewer.cookiePairString,
            currentUserInfo: {
              id: viewer.cookieID,
              anonymous: true,
            },
          };
        }
        sendMessage(authErrorMessage);
        ws.close(4100, error.message);
        return;
      } else if (error.message === "client_version_unsupported") {
        invariant(viewer, "should be set");
        const promises = {};
        promises.deleteCookie = deleteCookie(viewer.cookieID);
        if (viewer.cookieSource !== cookieSources.BODY) {
          promises.anonymousViewerData = createNewAnonymousCookie({
            platformDetails: error.platformDetails,
            deviceToken: viewer.deviceToken,
          });
        }
        const { anonymousViewerData } = await promiseAll(promises);
        const authErrorMessage: AuthErrorServerSocketMessage = {
          type: serverSocketMessageTypes.AUTH_ERROR,
          responseTo,
          message: error.message,
        }
        if (anonymousViewerData) {
          const anonViewer = new Viewer(anonymousViewerData);
          authErrorMessage.sessionChange = {
            cookie: anonViewer.cookiePairString,
            currentUserInfo: {
              id: anonViewer.cookieID,
              anonymous: true,
            },
          };
        }
        sendMessage(authErrorMessage);
        ws.close(4101, error.message);
        return;
      }
      sendMessage({
        type: serverSocketMessageTypes.ERROR,
        responseTo,
        message: error.message,
      });
      if (error.message === "not_logged_in") {
        ws.close(4101, error.message);
      } else if (error.message === "session_mutated_from_socket") {
        ws.close(4102, error.message);
      }
    }
  });
  ws.on('close', () => {
    console.log('connection closed');
  });
}

async function handleClientSocketMessage(
  viewer: Viewer,
  message: ClientSocketMessage,
): Promise<ServerSocketMessage[]> {
  if (message.type === clientSocketMessageTypes.INITIAL) {
    return await handleInitialClientSocketMessage(viewer, message);
  }
  return [];
}

async function handleInitialClientSocketMessage(
  viewer: Viewer,
  message: InitialClientSocketMessage,
): Promise<ServerSocketMessage[]> {
  const responses = [];

  const { sessionState, clientResponses } = message.payload;
  const {
    calendarQuery,
    updatesCurrentAsOf: oldUpdatesCurrentAsOf,
    messagesCurrentAsOf: oldMessagesCurrentAsOf,
    watchedIDs,
  } = sessionState;
  await verifyCalendarQueryThreadIDs(calendarQuery);

  const sessionInitializationResult = await initializeSession(
    viewer,
    calendarQuery,
    oldUpdatesCurrentAsOf,
  );

  const threadCursors = {};
  for (let watchedThreadID of watchedIDs) {
    threadCursors[watchedThreadID] = null;
  }
  const threadSelectionCriteria = { threadCursors, joinedThreads: true };
  const [
    fetchMessagesResult,
    { serverRequests, stateCheckStatus },
  ] = await Promise.all([
    fetchMessageInfosSince(
      viewer,
      threadSelectionCriteria,
      oldMessagesCurrentAsOf,
      defaultNumberPerThread,
    ),
    processClientResponses(
      viewer,
      clientResponses,
    ),
  ]);
  const messagesResult = {
    rawMessageInfos: fetchMessagesResult.rawMessageInfos,
    truncationStatuses: fetchMessagesResult.truncationStatuses,
    currentAsOf: mostRecentMessageTimestamp(
      fetchMessagesResult.rawMessageInfos,
      oldMessagesCurrentAsOf,
    ),
  };

  if (!sessionInitializationResult.sessionContinued) {
    const [
      threadsResult,
      entriesResult,
      currentUserInfo,
    ] = await Promise.all([
      fetchThreadInfos(viewer),
      fetchEntryInfos(viewer, [ calendarQuery ]),
      fetchCurrentUserInfo(viewer),
    ]);
    const payload: StateSyncFullSocketPayload = {
      type: stateSyncPayloadTypes.FULL,
      messagesResult,
      threadInfos: threadsResult.threadInfos,
      currentUserInfo,
      rawEntryInfos: entriesResult.rawEntryInfos,
      userInfos: values({
        ...fetchMessagesResult.userInfos,
        ...entriesResult.userInfos,
        ...threadsResult.userInfos,
      }),
    };
    if (viewer.sessionChanged) {
      // If initializeSession encounters sessionIdentifierTypes.BODY_SESSION_ID,
      // but the session is unspecified or expired, it will set a new sessionID
      // and specify viewer.sessionChanged
      const { sessionID } = viewer;
      invariant(sessionID !== null && sessionID !== undefined, "should be set");
      payload.sessionID = sessionID;
      viewer.sessionChanged = false;
    }
    responses.push({
      type: serverSocketMessageTypes.STATE_SYNC,
      responseTo: message.id,
      payload,
    });
  } else {
    const promises = {};
    promises.activityUpdate = updateActivityTime(viewer);
    promises.deleteExpiredUpdates = deleteUpdatesBeforeTimeTargettingSession(
      viewer,
      oldUpdatesCurrentAsOf,
    );
    promises.fetchUpdateResult = fetchUpdateInfos(
      viewer,
      oldUpdatesCurrentAsOf,
      calendarQuery,
    );
    if (stateCheckStatus) {
      promises.stateCheck = checkState(viewer, stateCheckStatus, calendarQuery);
    }
    const { fetchUpdateResult, stateCheck } = await promiseAll(promises);

    const updateUserInfos = fetchUpdateResult.userInfos;
    const { updateInfos } = fetchUpdateResult;
    const newUpdatesCurrentAsOf = mostRecentUpdateTimestamp(
      [...updateInfos],
      oldUpdatesCurrentAsOf,
    );
    const updatesResult = {
      newUpdates: updateInfos,
      currentAsOf: newUpdatesCurrentAsOf,
    };

    let sessionUpdate = sessionInitializationResult.sessionUpdate;
    if (stateCheck && stateCheck.sessionUpdate) {
      sessionUpdate = { ...sessionUpdate, ...stateCheck.sessionUpdate };
    }
    await commitSessionUpdate(viewer, sessionUpdate);

    if (stateCheck && stateCheck.checkStateRequest) {
      serverRequests.push(stateCheck.checkStateRequest);
    }

    responses.push({
      type: serverSocketMessageTypes.STATE_SYNC,
      responseTo: message.id,
      payload: {
        type: stateSyncPayloadTypes.INCREMENTAL,
        messagesResult,
        updatesResult,
        deltaEntryInfos:
          sessionInitializationResult.deltaEntryInfoResult.rawEntryInfos,
        userInfos: values({
          ...fetchMessagesResult.userInfos,
          ...updateUserInfos,
          ...sessionInitializationResult.deltaEntryInfoResult.userInfos,
        }),
      },
    });
  }

  if (serverRequests.length > 0) {
    responses.push({
      type: serverSocketMessageTypes.REQUESTS,
      payload: {
        serverRequests,
      },
    });
  }

  return responses;
}

export {
  onConnection,
};
