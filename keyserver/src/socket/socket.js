// @flow

import type { $Request } from 'express';
import invariant from 'invariant';
import _debounce from 'lodash/debounce.js';
import t from 'tcomb';
import type { TUnion } from 'tcomb';
import WebSocket from 'ws';

import { baseLegalPolicies } from 'lib/facts/policies.js';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils.js';
import {
  serverRequestSocketTimeout,
  serverResponseTimeout,
} from 'lib/shared/timeouts.js';
import { mostRecentUpdateTimestamp } from 'lib/shared/update-utils.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import { endpointIsSocketSafe } from 'lib/types/endpoints.js';
import { redisMessageTypes, type RedisMessage } from 'lib/types/redis-types.js';
import {
  serverRequestTypes,
  clientResponseInputValidator,
} from 'lib/types/request-types.js';
import {
  sessionCheckFrequency,
  stateCheckInactivityActivationInterval,
  sessionStateValidator,
} from 'lib/types/session-types.js';
import {
  type ClientSocketMessage,
  type InitialClientSocketMessage,
  type ResponsesClientSocketMessage,
  type ServerServerSocketMessage,
  type ErrorServerSocketMessage,
  type AuthErrorServerSocketMessage,
  type PingClientSocketMessage,
  type AckUpdatesClientSocketMessage,
  type APIRequestClientSocketMessage,
  clientSocketMessageTypes,
  serverSocketMessageTypes,
  serverServerSocketMessageValidator,
} from 'lib/types/socket-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';
import { ignorePromiseRejections } from 'lib/utils/promises.js';
import SequentialPromiseResolver from 'lib/utils/sequential-promise-resolver.js';
import sleep from 'lib/utils/sleep.js';
import { tShape, tCookie } from 'lib/utils/validation-utils.js';

import { fetchDataForSocketInit } from './fetch-data.js';
import { RedisSubscriber } from './redis.js';
import { processClientResponses, checkState } from './session-utils.js';
import { fetchUpdateInfosWithRawUpdateInfos } from '../creators/update-creator.js';
import { deleteActivityForViewerSession } from '../deleters/activity-deleters.js';
import { deleteCookie } from '../deleters/cookie-deleters.js';
import { deleteUpdatesBeforeTimeTargetingSession } from '../deleters/update-deleters.js';
import { jsonEndpoints } from '../endpoints.js';
import { getMessageFetchResultFromRedisMessages } from '../fetchers/message-fetchers.js';
import {
  fetchViewerForSocket,
  updateCookie,
  isCookieMissingSignedIdentityKeysBlob,
  isCookieMissingOlmNotificationsSession,
  createNewAnonymousCookie,
} from '../session/cookies.js';
import { Viewer } from '../session/viewer.js';
import type { AnonymousViewerData } from '../session/viewer.js';
import { commitSessionUpdate } from '../updaters/session-updaters.js';
import { compressMessage } from '../utils/compress.js';
import { assertSecureRequest } from '../utils/security-utils.js';
import {
  checkInputValidator,
  checkClientSupported,
  policiesValidator,
  validateOutput,
  validateInput,
} from '../utils/validation-utils.js';

const clientSocketMessageInputValidator: TUnion<ClientSocketMessage> = t.union([
  tShape<InitialClientSocketMessage>({
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
      sessionState: sessionStateValidator,
      clientResponses: t.list(clientResponseInputValidator),
    }),
  }),
  tShape<ResponsesClientSocketMessage>({
    type: t.irreducible(
      'clientSocketMessageTypes.RESPONSES',
      x => x === clientSocketMessageTypes.RESPONSES,
    ),
    id: t.Number,
    payload: tShape({
      clientResponses: t.list(clientResponseInputValidator),
    }),
  }),
  tShape<PingClientSocketMessage>({
    type: t.irreducible(
      'clientSocketMessageTypes.PING',
      x => x === clientSocketMessageTypes.PING,
    ),
    id: t.Number,
  }),
  tShape<AckUpdatesClientSocketMessage>({
    type: t.irreducible(
      'clientSocketMessageTypes.ACK_UPDATES',
      x => x === clientSocketMessageTypes.ACK_UPDATES,
    ),
    id: t.Number,
    payload: tShape({
      currentAsOf: t.Number,
    }),
  }),
  tShape<APIRequestClientSocketMessage>({
    type: t.irreducible(
      'clientSocketMessageTypes.API_REQUEST',
      x => x === clientSocketMessageTypes.API_REQUEST,
    ),
    id: t.Number,
    payload: tShape({
      endpoint: t.String,
      input: t.maybe(t.Object),
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

const minVersionsForCompression = {
  native: 265,
  web: 30,
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
  ): Promise<void> => {
    invariant(typeof messageString === 'string', 'message should be string');
    let responseTo = null;
    try {
      this.resetTimeout();
      const messageObject = JSON.parse(messageString);
      const clientSocketMessageWithClientIDs = checkInputValidator(
        clientSocketMessageInputValidator,
        messageObject,
        'socket message',
      );
      responseTo = clientSocketMessageWithClientIDs.id;
      if (
        clientSocketMessageWithClientIDs.type ===
        clientSocketMessageTypes.INITIAL
      ) {
        if (this.viewer) {
          // This indicates that the user sent multiple INITIAL messages.
          throw new ServerError('socket_already_initialized');
        }
        this.viewer = await fetchViewerForSocket(
          this.httpRequest,
          clientSocketMessageWithClientIDs,
        );
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
        clientSocketMessageWithClientIDs,
      );
      await policiesValidator(viewer, baseLegalPolicies);
      const clientSocketMessage = await validateInput(
        viewer,
        clientSocketMessageInputValidator,
        clientSocketMessageWithClientIDs,
        `socket message type ${clientSocketMessageWithClientIDs.type}`,
      );

      const serverResponses =
        await this.handleClientSocketMessage(clientSocketMessage);
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
        ignorePromiseRejections(updateCookie(viewer));
      }
      for (const response of serverResponses) {
        // Normally it's an anti-pattern to await in sequence like this. But in
        // this case, we have a requirement that this array of serverResponses
        // is delivered in order. See here:
        // https://github.com/CommE2E/comm/blob/101eb34481deb49c609bfd2c785f375886e52666/keyserver/src/socket/socket.js#L566-L568
        await this.sendMessage(response);
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
        if (responseTo !== null) {
          errorMessage.responseTo = responseTo;
        }
        this.markActivityOccurred();
        await this.sendMessage(errorMessage);
        return;
      }
      invariant(responseTo, 'should be set');
      if (error.message === 'socket_deauthorized') {
        invariant(this.viewer, 'should be set');
        const authErrorMessage: AuthErrorServerSocketMessage = {
          type: serverSocketMessageTypes.AUTH_ERROR,
          responseTo,
          message: error.message,
          sessionChange: {
            cookie: this.viewer.cookiePairString,
            currentUserInfo: {
              anonymous: true,
            },
          },
        };

        await this.sendMessage(authErrorMessage);
        this.ws.close(4100, error.message);
        return;
      } else if (error.message === 'client_version_unsupported') {
        const { viewer } = this;
        invariant(viewer, 'should be set');

        const anonymousViewerDataPromise: Promise<AnonymousViewerData> =
          createNewAnonymousCookie({
            platformDetails: error.platformDetails,
            deviceToken: viewer.deviceToken,
          });
        const deleteCookiePromise = deleteCookie(viewer.cookieID);
        const [anonymousViewerData] = await Promise.all([
          anonymousViewerDataPromise,
          deleteCookiePromise,
        ]);

        // It is normally not safe to pass the result of
        // createNewAnonymousCookie to the Viewer constructor. That is because
        // createNewAnonymousCookie leaves several fields of
        // AnonymousViewerData unset, and consequently Viewer will throw when
        // access is attempted. It is only safe here because we can guarantee
        // that only cookiePairString and cookieID are accessed on anonViewer
        // below.
        const anonViewer = new Viewer(anonymousViewerData);
        const authErrorMessage: AuthErrorServerSocketMessage = {
          type: serverSocketMessageTypes.AUTH_ERROR,
          responseTo,
          message: error.message,
          sessionChange: {
            cookie: anonViewer.cookiePairString,
            currentUserInfo: {
              anonymous: true,
            },
          },
        };
        await this.sendMessage(authErrorMessage);
        this.ws.close(4101, error.message);
        return;
      }
      if (error.payload) {
        await this.sendMessage({
          type: serverSocketMessageTypes.ERROR,
          responseTo,
          message: error.message,
          payload: error.payload,
        });
      } else {
        await this.sendMessage({
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

  sendMessage = async (message: ServerServerSocketMessage) => {
    invariant(
      this.ws.readyState > 0,
      "shouldn't send message until connection established",
    );
    if (this.ws.readyState !== 1) {
      return;
    }

    const { viewer } = this;
    const validatedMessage = await validateOutput(
      viewer?.platformDetails,
      serverServerSocketMessageValidator,
      message,
    );
    const stringMessage = JSON.stringify(validatedMessage);

    if (
      !viewer?.platformDetails ||
      !hasMinCodeVersion(viewer.platformDetails, minVersionsForCompression)
    ) {
      this.ws.send(stringMessage);
      return;
    }

    const compressionResult = await compressMessage(stringMessage);

    if (this.ws.readyState !== 1) {
      return;
    }

    if (!compressionResult.compressed) {
      this.ws.send(stringMessage);
      return;
    }

    const compressedMessage = {
      type: serverSocketMessageTypes.COMPRESSED_MESSAGE,
      payload: compressionResult.result,
    };

    const validatedCompressedMessage = await validateOutput(
      viewer?.platformDetails,
      serverServerSocketMessageValidator,
      compressedMessage,
    );
    const stringCompressedMessage = JSON.stringify(validatedCompressedMessage);
    this.ws.send(stringCompressedMessage);
  };

  async handleClientSocketMessage(
    message: ClientSocketMessage,
  ): Promise<ServerServerSocketMessage[]> {
    const resultPromise: Promise<ServerServerSocketMessage[]> = (async () => {
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
    const timeoutPromise: Promise<empty> = (async () => {
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

    const responses: Array<ServerServerSocketMessage> = [];

    const { sessionState, clientResponses } = message.payload;

    const payload = await fetchDataForSocketInit(viewer, sessionState);
    responses.push({
      type: serverSocketMessageTypes.STATE_SYNC,
      responseTo: message.id,
      payload,
    });

    const [
      { serverRequests, activityUpdateResult },
      signedIdentityKeysBlobMissing,
      olmNotificationsSessionMissing,
    ] = await Promise.all([
      processClientResponses(viewer, clientResponses),
      isCookieMissingSignedIdentityKeysBlob(viewer.cookieID),
      isCookieMissingOlmNotificationsSession(viewer),
    ]);

    if (signedIdentityKeysBlobMissing) {
      serverRequests.push({
        type: serverRequestTypes.SIGNED_IDENTITY_KEYS_BLOB,
      });
    }

    if (olmNotificationsSessionMissing) {
      serverRequests.push({
        type: serverRequestTypes.INITIAL_NOTIFICATIONS_ENCRYPTED_MESSAGE,
      });
      const { userID, cookieID, sessionID } = viewer;
      const data = { userID, cookieID, sessionID };
      console.log(
        'Sending serverRequestTypes.INITIAL_NOTIFICATIONS_ENCRYPTED_MESSAGE ' +
          JSON.stringify(data),
      );
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
  resetTimeout: { +cancel: () => void } & (() => void) = _debounce(
    () => this.ws.terminate(),
    serverRequestSocketTimeout,
  );

  debouncedAfterActivity: { +cancel: () => void } & (() => void) = _debounce(
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

  setStateCheckConditions(newConditions: Partial<StateCheckConditions>) {
    this.stateCheckConditions = {
      ...this.stateCheckConditions,
      ...newConditions,
    };
    this.handleStateCheckConditionsUpdate();
  }

  get stateCheckCanStart(): boolean {
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
      ignorePromiseRejections(this.initiateStateCheck());
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

    const { checkStateRequest } = await checkState(viewer, {
      status: 'state_check',
    });
    invariant(checkStateRequest, 'should be set');

    await this.sendMessage({
      type: serverSocketMessageTypes.REQUESTS,
      payload: { serverRequests: [checkStateRequest] },
    });
  };
}

export { onConnection };
