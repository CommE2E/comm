// @flow

import type { $Request } from 'express';
import invariant from 'invariant';
import _debounce from 'lodash/debounce.js';
import t from 'tcomb';
import WebSocket from 'ws';

import { baseLegalPolicies } from 'lib/facts/policies.js';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils.js';
import {
  serverRequestSocketTimeout,
  serverResponseTimeout,
} from 'lib/shared/timeouts.js';
import { mostRecentUpdateTimestamp } from 'lib/shared/update-utils.js';
import type { Shape } from 'lib/types/core.js';
import { endpointIsSocketSafe } from 'lib/types/endpoints.js';
import { defaultNumberPerThread } from 'lib/types/message-types.js';
import { redisMessageTypes, type RedisMessage } from 'lib/types/redis-types.js';
import { serverRequestTypes } from 'lib/types/request-types.js';
import {
  cookieSources,
  sessionCheckFrequency,
  stateCheckInactivityActivationInterval,
} from 'lib/types/session-types.js';
import {
  type ClientSocketMessage,
  type InitialClientSocketMessage,
  type ResponsesClientSocketMessage,
  type ServerStateSyncFullSocketPayload,
  type ServerServerSocketMessage,
  type ErrorServerSocketMessage,
  type AuthErrorServerSocketMessage,
  type PingClientSocketMessage,
  type AckUpdatesClientSocketMessage,
  type APIRequestClientSocketMessage,
  clientSocketMessageTypes,
  stateSyncPayloadTypes,
  serverSocketMessageTypes,
} from 'lib/types/socket-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';
import { promiseAll } from 'lib/utils/promises.js';
import SequentialPromiseResolver from 'lib/utils/sequential-promise-resolver.js';
import sleep from 'lib/utils/sleep.js';
import { tShape, tCookie } from 'lib/utils/validation-utils.js';

import { RedisSubscriber } from './redis.js';
import {
  clientResponseInputValidator,
  processClientResponses,
  initializeSession,
  checkState,
} from './session-utils.js';
import { fetchUpdateInfosWithRawUpdateInfos } from '../creators/update-creator.js';
import { deleteActivityForViewerSession } from '../deleters/activity-deleters.js';
import { deleteCookie } from '../deleters/cookie-deleters.js';
import { deleteUpdatesBeforeTimeTargetingSession } from '../deleters/update-deleters.js';
import { jsonEndpoints } from '../endpoints.js';
import { fetchEntryInfos } from '../fetchers/entry-fetchers.js';
import {
  fetchMessageInfosSince,
  getMessageFetchResultFromRedisMessages,
} from '../fetchers/message-fetchers.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import { fetchUpdateInfos } from '../fetchers/update-fetchers.js';
import {
  fetchCurrentUserInfo,
  fetchKnownUserInfos,
} from '../fetchers/user-fetchers.js';
import {
  newEntryQueryInputValidator,
  verifyCalendarQueryThreadIDs,
} from '../responders/entry-responders.js';
import { handleAsyncPromise } from '../responders/handlers.js';
import {
  fetchViewerForSocket,
  extendCookieLifespan,
  createNewAnonymousCookie,
  isCookieMissingSignedIdentityKeysBlob,
} from '../session/cookies.js';
import { Viewer } from '../session/viewer.js';
import { commitSessionUpdate } from '../updaters/session-updaters.js';
import { assertSecureRequest } from '../utils/security-utils.js';
import {
  checkInputValidator,
  checkClientSupported,
  policiesValidator,
} from '../utils/validation-utils.js';

const clientSocketMessageInputValidator = t.union([
  tShape({
    type: t.irreducible(
      'clientSocketMessageTypes.INITIAL',
      x => x === clientSocketMessageTypes.INITIAL,
    ),
    id: t.Number,
    payload: tShape({
      sessionIdentification: tShape({
        cookie: t.maybe(tCookie),
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
  }),
  tShape({
    type: t.irreducible(
      'clientSocketMessageTypes.RESPONSES',
      x => x === clientSocketMessageTypes.RESPONSES,
    ),
    id: t.Number,
    payload: tShape({
      clientResponses: t.list(clientResponseInputValidator),
    }),
  }),
  tShape({
    type: t.irreducible(
      'clientSocketMessageTypes.PING',
      x => x === clientSocketMessageTypes.PING,
    ),
    id: t.Number,
  }),
  tShape({
    type: t.irreducible(
      'clientSocketMessageTypes.ACK_UPDATES',
      x => x === clientSocketMessageTypes.ACK_UPDATES,
    ),
    id: t.Number,
    payload: tShape({
      currentAsOf: t.Number,
    }),
  }),
  tShape({
    type: t.irreducible(
      'clientSocketMessageTypes.API_REQUEST',
      x => x === clientSocketMessageTypes.API_REQUEST,
    ),
    id: t.Number,
    payload: tShape({
      endpoint: t.String,
      input: t.Object,
    }),
  }),
]);

function onConnection(ws: WebSocket, req: $Request) {
  assertSecureRequest(req);
  new Socket(ws, req);
}

type StateCheckConditions = {
  activityRecentlyOccurred: boolean,
  stateCheckOngoing: boolean,
};

class Socket {
  ws: WebSocket;
  httpRequest: $Request;
  viewer: ?Viewer;
  redis: ?RedisSubscriber;
  redisPromiseResolver: SequentialPromiseResolver<ServerServerSocketMessage>;

  stateCheckConditions: StateCheckConditions = {
    activityRecentlyOccurred: true,
    stateCheckOngoing: false,
  };
  stateCheckTimeoutID: ?TimeoutID;

  constructor(ws: WebSocket, httpRequest: $Request) {
    this.ws = ws;
    this.httpRequest = httpRequest;
    ws.on('message', this.onMessage);
    ws.on('close', this.onClose);
    this.resetTimeout();
    this.redisPromiseResolver = new SequentialPromiseResolver(this.sendMessage);
  }

  onMessage = async (
    messageString: string | Buffer | ArrayBuffer | Array<Buffer>,
  ) => {
    invariant(typeof messageString === 'string', 'message should be string');
    let clientSocketMessage: ?ClientSocketMessage;
    try {
      this.resetTimeout();
      clientSocketMessage = JSON.parse(messageString);
      checkInputValidator(
        clientSocketMessageInputValidator,
        clientSocketMessage,
      );
      if (clientSocketMessage.type === clientSocketMessageTypes.INITIAL) {
        if (this.viewer) {
          // This indicates that the user sent multiple INITIAL messages.
          throw new ServerError('socket_already_initialized');
        }
        this.viewer = await fetchViewerForSocket(
          this.httpRequest,
          clientSocketMessage,
        );
        if (!this.viewer) {
          // This indicates that the cookie was invalid, but the client is using
          // cookieSources.HEADER and thus can't accept a new cookie over
          // WebSockets. See comment under catch block for socket_deauthorized.
          throw new ServerError('socket_deauthorized');
        }
      }
      const { viewer } = this;
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
      await policiesValidator(viewer, baseLegalPolicies);

      const serverResponses = await this.handleClientSocketMessage(
        clientSocketMessage,
      );
      if (!this.redis) {
        this.redis = new RedisSubscriber(
          { userID: viewer.userID, sessionID: viewer.session },
          this.onRedisMessage,
        );
      }
      if (viewer.sessionChanged) {
        // This indicates that something has caused the session to change, which
        // shouldn't happen from inside a WebSocket since we can't handle cookie
        // invalidation.
        throw new ServerError('session_mutated_from_socket');
      }
      if (clientSocketMessage.type !== clientSocketMessageTypes.PING) {
        handleAsyncPromise(extendCookieLifespan(viewer.cookieID));
      }
      for (const response of serverResponses) {
        this.sendMessage(response);
      }
      if (clientSocketMessage.type === clientSocketMessageTypes.INITIAL) {
        this.onSuccessfulConnection();
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
        this.markActivityOccurred();
        this.sendMessage(errorMessage);
        return;
      }
      invariant(clientSocketMessage, 'should be set');
      const responseTo = clientSocketMessage.id;
      if (error.message === 'socket_deauthorized') {
        const authErrorMessage: AuthErrorServerSocketMessage = {
          type: serverSocketMessageTypes.AUTH_ERROR,
          responseTo,
          message: error.message,
        };
        if (this.viewer) {
          // viewer should only be falsey for cookieSources.HEADER (web)
          // clients. Usually if the cookie is invalid we construct a new
          // anonymous Viewer with a new cookie, and then pass the cookie down
          // in the error. But we can't pass HTTP cookies in WebSocket messages.
          authErrorMessage.sessionChange = {
            cookie: this.viewer.cookiePairString,
            currentUserInfo: {
              id: this.viewer.cookieID,
              anonymous: true,
            },
          };
        }
        this.sendMessage(authErrorMessage);
        this.ws.close(4100, error.message);
        return;
      } else if (error.message === 'client_version_unsupported') {
        const { viewer } = this;
        invariant(viewer, 'should be set');
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
        };
        if (anonymousViewerData) {
          // It is normally not safe to pass the result of
          // createNewAnonymousCookie to the Viewer constructor. That is because
          // createNewAnonymousCookie leaves several fields of
          // AnonymousViewerData unset, and consequently Viewer will throw when
          // access is attempted. It is only safe here because we can guarantee
          // that only cookiePairString and cookieID are accessed on anonViewer
          // below.
          const anonViewer = new Viewer(anonymousViewerData);
          authErrorMessage.sessionChange = {
            cookie: anonViewer.cookiePairString,
            currentUserInfo: {
              id: anonViewer.cookieID,
              anonymous: true,
            },
          };
        }
        this.sendMessage(authErrorMessage);
        this.ws.close(4101, error.message);
        return;
      }
      if (error.payload) {
        this.sendMessage({
          type: serverSocketMessageTypes.ERROR,
          responseTo,
          message: error.message,
          payload: error.payload,
        });
      } else {
        this.sendMessage({
          type: serverSocketMessageTypes.ERROR,
          responseTo,
          message: error.message,
        });
      }
      if (error.message === 'not_logged_in') {
        this.ws.close(4102, error.message);
      } else if (error.message === 'session_mutated_from_socket') {
        this.ws.close(4103, error.message);
      } else {
        this.markActivityOccurred();
      }
    }
  };

  onClose = async () => {
    this.clearStateCheckTimeout();
    this.resetTimeout.cancel();
    this.debouncedAfterActivity.cancel();
    if (this.viewer && this.viewer.hasSessionInfo) {
      await deleteActivityForViewerSession(this.viewer);
    }
    if (this.redis) {
      this.redis.quit();
      this.redis = null;
    }
  };

  sendMessage = (message: ServerServerSocketMessage) => {
    invariant(
      this.ws.readyState > 0,
      "shouldn't send message until connection established",
    );
    if (this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(message));
    }
  };

  async handleClientSocketMessage(
    message: ClientSocketMessage,
  ): Promise<ServerServerSocketMessage[]> {
    const resultPromise = (async () => {
      if (message.type === clientSocketMessageTypes.INITIAL) {
        this.markActivityOccurred();
        return await this.handleInitialClientSocketMessage(message);
      } else if (message.type === clientSocketMessageTypes.RESPONSES) {
        this.markActivityOccurred();
        return await this.handleResponsesClientSocketMessage(message);
      } else if (message.type === clientSocketMessageTypes.PING) {
        return this.handlePingClientSocketMessage(message);
      } else if (message.type === clientSocketMessageTypes.ACK_UPDATES) {
        this.markActivityOccurred();
        return await this.handleAckUpdatesClientSocketMessage(message);
      } else if (message.type === clientSocketMessageTypes.API_REQUEST) {
        this.markActivityOccurred();
        return await this.handleAPIRequestClientSocketMessage(message);
      }
      return [];
    })();
    const timeoutPromise = (async () => {
      await sleep(serverResponseTimeout);
      throw new ServerError('socket_response_timeout');
    })();
    return await Promise.race([resultPromise, timeoutPromise]);
  }

  async handleInitialClientSocketMessage(
    message: InitialClientSocketMessage,
  ): Promise<ServerServerSocketMessage[]> {
    const { viewer } = this;
    invariant(viewer, 'should be set');

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
    for (const watchedThreadID of watchedIDs) {
      threadCursors[watchedThreadID] = null;
    }
    const messageSelectionCriteria = {
      threadCursors,
      joinedThreads: true,
      newerThan: oldMessagesCurrentAsOf,
    };
    const [fetchMessagesResult, { serverRequests, activityUpdateResult }] =
      await Promise.all([
        fetchMessageInfosSince(
          viewer,
          messageSelectionCriteria,
          defaultNumberPerThread,
        ),
        processClientResponses(viewer, clientResponses),
      ]);
    const messagesResult = {
      rawMessageInfos: fetchMessagesResult.rawMessageInfos,
      truncationStatuses: fetchMessagesResult.truncationStatuses,
      currentAsOf: mostRecentMessageTimestamp(
        fetchMessagesResult.rawMessageInfos,
        oldMessagesCurrentAsOf,
      ),
    };

    if (
      viewer.userAgent?.includes('Electron') &&
      viewer.platform === 'web' &&
      !serverRequests.find(
        request => request.type === serverRequestTypes.PLATFORM_DETAILS,
      )
    ) {
      serverRequests.push({ type: serverRequestTypes.PLATFORM_DETAILS });
    }

    if (!sessionInitializationResult.sessionContinued) {
      const [threadsResult, entriesResult, currentUserInfo, knownUserInfos] =
        await Promise.all([
          fetchThreadInfos(viewer),
          fetchEntryInfos(viewer, [calendarQuery]),
          fetchCurrentUserInfo(viewer),
          fetchKnownUserInfos(viewer),
        ]);
      const payload: ServerStateSyncFullSocketPayload = {
        type: stateSyncPayloadTypes.FULL,
        messagesResult,
        threadInfos: threadsResult.threadInfos,
        currentUserInfo,
        rawEntryInfos: entriesResult.rawEntryInfos,
        userInfos: values(knownUserInfos),
        updatesCurrentAsOf: oldUpdatesCurrentAsOf,
      };
      if (viewer.sessionChanged) {
        // If initializeSession encounters,
        // sessionIdentifierTypes.BODY_SESSION_ID but the session
        // is unspecified or expired,
        // it will set a new sessionID and specify viewer.sessionChanged
        const { sessionID } = viewer;
        invariant(
          sessionID !== null && sessionID !== undefined,
          'should be set',
        );
        payload.sessionID = sessionID;
        viewer.sessionChanged = false;
      }
      responses.push({
        type: serverSocketMessageTypes.STATE_SYNC,
        responseTo: message.id,
        payload,
      });
    } else {
      const { sessionUpdate, deltaEntryInfoResult } =
        sessionInitializationResult;

      const promises = {};
      promises.deleteExpiredUpdates = deleteUpdatesBeforeTimeTargetingSession(
        viewer,
        oldUpdatesCurrentAsOf,
      );
      promises.fetchUpdateResult = fetchUpdateInfos(
        viewer,
        oldUpdatesCurrentAsOf,
        calendarQuery,
      );
      promises.sessionUpdate = commitSessionUpdate(viewer, sessionUpdate);
      const { fetchUpdateResult } = await promiseAll(promises);

      const { updateInfos, userInfos } = fetchUpdateResult;
      const newUpdatesCurrentAsOf = mostRecentUpdateTimestamp(
        [...updateInfos],
        oldUpdatesCurrentAsOf,
      );
      const updatesResult = {
        newUpdates: updateInfos,
        currentAsOf: newUpdatesCurrentAsOf,
      };

      responses.push({
        type: serverSocketMessageTypes.STATE_SYNC,
        responseTo: message.id,
        payload: {
          type: stateSyncPayloadTypes.INCREMENTAL,
          messagesResult,
          updatesResult,
          deltaEntryInfos: deltaEntryInfoResult.rawEntryInfos,
          deletedEntryIDs: deltaEntryInfoResult.deletedEntryIDs,
          userInfos: values(userInfos),
        },
      });
    }

    const signedIdentityKeysBlobMissing =
      await isCookieMissingSignedIdentityKeysBlob(viewer.cookieID);

    if (signedIdentityKeysBlobMissing) {
      serverRequests.push({
        type: serverRequestTypes.SIGNED_IDENTITY_KEYS_BLOB,
      });
    }

    if (serverRequests.length > 0 || clientResponses.length > 0) {
      // We send this message first since the STATE_SYNC triggers the client's
      // connection status to shift to "connected", and we want to make sure the
      // client responses are cleared from Redux before that happens
      responses.unshift({
        type: serverSocketMessageTypes.REQUESTS,
        responseTo: message.id,
        payload: { serverRequests },
      });
    }

    if (activityUpdateResult) {
      // Same reason for unshifting as above
      responses.unshift({
        type: serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE,
        responseTo: message.id,
        payload: activityUpdateResult,
      });
    }

    return responses;
  }

  async handleResponsesClientSocketMessage(
    message: ResponsesClientSocketMessage,
  ): Promise<ServerServerSocketMessage[]> {
    const { viewer } = this;
    invariant(viewer, 'should be set');

    const { clientResponses } = message.payload;
    const { stateCheckStatus } = await processClientResponses(
      viewer,
      clientResponses,
    );

    const serverRequests = [];
    if (stateCheckStatus && stateCheckStatus.status !== 'state_check') {
      const { sessionUpdate, checkStateRequest } = await checkState(
        viewer,
        stateCheckStatus,
        viewer.calendarQuery,
      );
      if (sessionUpdate) {
        await commitSessionUpdate(viewer, sessionUpdate);
        this.setStateCheckConditions({ stateCheckOngoing: false });
      }
      if (checkStateRequest) {
        serverRequests.push(checkStateRequest);
      }
    }

    // We send a response message regardless of whether we have any requests,
    // since we need to ack the client's responses
    return [
      {
        type: serverSocketMessageTypes.REQUESTS,
        responseTo: message.id,
        payload: { serverRequests },
      },
    ];
  }

  handlePingClientSocketMessage(
    message: PingClientSocketMessage,
  ): ServerServerSocketMessage[] {
    return [
      {
        type: serverSocketMessageTypes.PONG,
        responseTo: message.id,
      },
    ];
  }

  async handleAckUpdatesClientSocketMessage(
    message: AckUpdatesClientSocketMessage,
  ): Promise<ServerServerSocketMessage[]> {
    const { viewer } = this;
    invariant(viewer, 'should be set');
    const { currentAsOf } = message.payload;
    await Promise.all([
      deleteUpdatesBeforeTimeTargetingSession(viewer, currentAsOf),
      commitSessionUpdate(viewer, { lastUpdate: currentAsOf }),
    ]);
    return [];
  }

  async handleAPIRequestClientSocketMessage(
    message: APIRequestClientSocketMessage,
  ): Promise<ServerServerSocketMessage[]> {
    if (!endpointIsSocketSafe(message.payload.endpoint)) {
      throw new ServerError('endpoint_unsafe_for_socket');
    }
    const { viewer } = this;
    invariant(viewer, 'should be set');
    const responder = jsonEndpoints[message.payload.endpoint];
    await policiesValidator(viewer, responder.requiredPolicies);
    const response = await responder.responder(viewer, message.payload.input);
    return [
      {
        type: serverSocketMessageTypes.API_RESPONSE,
        responseTo: message.id,
        payload: response,
      },
    ];
  }

  onRedisMessage = async (message: RedisMessage) => {
    try {
      await this.processRedisMessage(message);
    } catch (e) {
      console.warn(e);
    }
  };

  async processRedisMessage(message: RedisMessage) {
    if (message.type === redisMessageTypes.START_SUBSCRIPTION) {
      this.ws.terminate();
    } else if (message.type === redisMessageTypes.NEW_UPDATES) {
      const { viewer } = this;
      invariant(viewer, 'should be set');
      if (message.ignoreSession && message.ignoreSession === viewer.session) {
        return;
      }
      const rawUpdateInfos = message.updates;
      this.redisPromiseResolver.add(
        (async () => {
          const { updateInfos, userInfos } =
            await fetchUpdateInfosWithRawUpdateInfos(rawUpdateInfos, {
              viewer,
            });
          if (updateInfos.length === 0) {
            console.warn(
              'could not get any UpdateInfos from redisMessageTypes.NEW_UPDATES',
            );
            return null;
          }
          this.markActivityOccurred();
          return {
            type: serverSocketMessageTypes.UPDATES,
            payload: {
              updatesResult: {
                currentAsOf: mostRecentUpdateTimestamp([...updateInfos], 0),
                newUpdates: updateInfos,
              },
              userInfos: values(userInfos),
            },
          };
        })(),
      );
    } else if (message.type === redisMessageTypes.NEW_MESSAGES) {
      const { viewer } = this;
      invariant(viewer, 'should be set');
      const rawMessageInfos = message.messages;
      const messageFetchResult = getMessageFetchResultFromRedisMessages(
        viewer,
        rawMessageInfos,
      );
      if (messageFetchResult.rawMessageInfos.length === 0) {
        console.warn(
          'could not get any rawMessageInfos from ' +
            'redisMessageTypes.NEW_MESSAGES',
        );
        return;
      }
      this.redisPromiseResolver.add(
        (async () => {
          this.markActivityOccurred();
          return {
            type: serverSocketMessageTypes.MESSAGES,
            payload: {
              messagesResult: {
                rawMessageInfos: messageFetchResult.rawMessageInfos,
                truncationStatuses: messageFetchResult.truncationStatuses,
                currentAsOf: mostRecentMessageTimestamp(
                  messageFetchResult.rawMessageInfos,
                  0,
                ),
              },
            },
          };
        })(),
      );
    }
  }

  onSuccessfulConnection() {
    if (this.ws.readyState !== 1) {
      return;
    }
    this.handleStateCheckConditionsUpdate();
  }

  // The Socket will timeout by calling this.ws.terminate()
  // serverRequestSocketTimeout milliseconds after the last
  // time resetTimeout is called
  resetTimeout = _debounce(
    () => this.ws.terminate(),
    serverRequestSocketTimeout,
  );

  debouncedAfterActivity = _debounce(
    () => this.setStateCheckConditions({ activityRecentlyOccurred: false }),
    stateCheckInactivityActivationInterval,
  );

  markActivityOccurred = () => {
    if (this.ws.readyState !== 1) {
      return;
    }
    this.setStateCheckConditions({ activityRecentlyOccurred: true });
    this.debouncedAfterActivity();
  };

  clearStateCheckTimeout() {
    const { stateCheckTimeoutID } = this;
    if (stateCheckTimeoutID) {
      clearTimeout(stateCheckTimeoutID);
      this.stateCheckTimeoutID = null;
    }
  }

  setStateCheckConditions(newConditions: Shape<StateCheckConditions>) {
    this.stateCheckConditions = {
      ...this.stateCheckConditions,
      ...newConditions,
    };
    this.handleStateCheckConditionsUpdate();
  }

  get stateCheckCanStart() {
    return Object.values(this.stateCheckConditions).every(cond => !cond);
  }

  handleStateCheckConditionsUpdate() {
    if (!this.stateCheckCanStart) {
      this.clearStateCheckTimeout();
      return;
    }
    if (this.stateCheckTimeoutID) {
      return;
    }
    const { viewer } = this;
    if (!viewer) {
      return;
    }
    const timeUntilStateCheck =
      viewer.sessionLastValidated + sessionCheckFrequency - Date.now();
    if (timeUntilStateCheck <= 0) {
      this.initiateStateCheck();
    } else {
      this.stateCheckTimeoutID = setTimeout(
        this.initiateStateCheck,
        timeUntilStateCheck,
      );
    }
  }

  initiateStateCheck = async () => {
    this.setStateCheckConditions({ stateCheckOngoing: true });

    const { viewer } = this;
    invariant(viewer, 'should be set');

    const { checkStateRequest } = await checkState(
      viewer,
      { status: 'state_check' },
      viewer.calendarQuery,
    );
    invariant(checkStateRequest, 'should be set');

    this.sendMessage({
      type: serverSocketMessageTypes.REQUESTS,
      payload: { serverRequests: [checkStateRequest] },
    });
  };
}

export { onConnection };
