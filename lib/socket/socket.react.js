// @flow

import {
  type ServerRequest,
  serverRequestTypes,
  type ClientResponse,
  clearDeliveredClientResponsesActionType,
  processServerRequestsActionType,
  clientResponsePropType,
} from '../types/request-types';
import {
  type SessionState,
  type SessionIdentification,
  sessionIdentificationPropType,
} from '../types/session-types';
import {
  clientSocketMessageTypes,
  type ClientSocketMessage,
  serverSocketMessageTypes,
  type ServerSocketMessage,
  stateSyncPayloadTypes,
  fullStateSyncActionType,
  incrementalStateSyncActionType,
  updateConnectionStatusActionType,
  connectionInfoPropType,
  type ConnectionInfo,
  queueActivityUpdatesActionType,
  activityUpdateSuccessActionType,
  activityUpdateFailedActionType,
  type ActivityUpdateResponseServerSocketMessage,
  type RequestsServerSocketMessage,
} from '../types/socket-types';
import {
  type InflightRequest,
  resolveRequests,
} from './inflight-requests';
import type { ActivityUpdate } from '../types/activity-types';
import type { Dispatch } from '../types/redux-types';
import type { DispatchActionPayload } from '../utils/action-utils';
import type { LogInExtraInfo } from '../types/account-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { getConfig } from '../utils/config';
import {
  registerActiveWebSocket,
  setNewSessionActionType,
  fetchNewCookieFromNativeCredentials,
} from '../utils/action-utils';
import { socketAuthErrorResolutionAttempt } from '../actions/user-actions';
import { ServerError } from '../utils/errors';
import { pingFrequency } from '../shared/timeouts';

type Props = {|
  // Redux state
  active: bool,
  openSocket: () => WebSocket,
  queuedClientResponses: $ReadOnlyArray<ClientResponse>,
  getClientResponses: (
    activeServerRequests: $ReadOnlyArray<ServerRequest>,
  ) => $ReadOnlyArray<ClientResponse>,
  activeThread: ?string,
  activeThreadLatestMessage: ?string,
  sessionStateFunc: () => SessionState,
  sessionIdentification: SessionIdentification,
  cookie: ?string,
  urlPrefix: string,
  logInExtraInfo: () => LogInExtraInfo,
  connection: ConnectionInfo,
  // Redux dispatch functions
  dispatch: Dispatch,
  dispatchActionPayload: DispatchActionPayload,
|};
class Socket extends React.PureComponent<Props> {

  static propTypes = {
    openSocket: PropTypes.func.isRequired,
    active: PropTypes.bool.isRequired,
    queuedClientResponses: PropTypes.arrayOf(clientResponsePropType).isRequired,
    getClientResponses: PropTypes.func.isRequired,
    activeThread: PropTypes.string,
    activeThreadLatestMessage: PropTypes.string,
    sessionStateFunc: PropTypes.func.isRequired,
    sessionIdentification: sessionIdentificationPropType.isRequired,
    cookie: PropTypes.string,
    urlPrefix: PropTypes.string.isRequired,
    logInExtraInfo: PropTypes.func.isRequired,
    connection: connectionInfoPropType.isRequired,
    dispatch: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  socket: ?WebSocket;
  nextClientMessageID = 0;
  inflightRequests: InflightRequest[] = [];
  pingTimeoutID: ?TimeoutID
  initialPlatformDetailsSent = false;
  reopenConnectionAfterClosing = false;

  openSocket() {
    if (this.socket) {
      const { status } = this.props.connection;
      if (status === "forcedDisconnecting") {
        this.reopenConnectionAfterClosing = true;
        return;
      } else if (status === "disconnecting" && this.socket.readyState === 1) {
        this.markSocketInitialized();
        return;
      } else if (
        status === "connected" ||
        status === "connecting" ||
        status === "reconnecting"
      ) {
        return;
      }
      if (this.socket.readyState < 2) {
        this.socket.close();
        console.warn(`this.socket seems open, but Redux thinks it's ${status}`);
      }
    }
    this.props.dispatchActionPayload(
      updateConnectionStatusActionType,
      { status: "connecting" },
    );
    const socket = this.props.openSocket();
    socket.onopen = () => {
      if (this.socket === socket) {
        this.sendInitialMessage();
      }
    };
    socket.onmessage = this.receiveMessage;
    socket.onclose = (event: CloseEvent) => {
      if (this.socket === socket) {
        this.onClose(event);
      }
    };
    this.socket = socket;
    this.inflightRequests = [];
  }

  markSocketInitialized() {
    registerActiveWebSocket(this.socket);
    this.props.dispatchActionPayload(
      updateConnectionStatusActionType,
      { status: "connected" },
    );
    this.resetPing();
  }

  closeSocket(activityUpdates: $ReadOnlyArray<ActivityUpdate>) {
    const { status } = this.props.connection;
    if (status === "disconnected") {
      return;
    } else if (status === "disconnecting" || status === "forcedDisconnecting") {
      this.reopenConnectionAfterClosing = false;
      return;
    }
    registerActiveWebSocket(null);
    this.stopPing();
    this.props.dispatchActionPayload(
      updateConnectionStatusActionType,
      { status: "disconnecting" },
    );
    this.sendFinalActivityUpdates(activityUpdates);
    this.finishClosingSocket();
  }

  forceCloseSocket(activityUpdates: $ReadOnlyArray<ActivityUpdate>) {
    registerActiveWebSocket(null);
    this.stopPing();
    const { status } = this.props.connection;
    if (status !== "forcedDisconnecting" && status !== "disconnected") {
      this.props.dispatchActionPayload(
        updateConnectionStatusActionType,
        { status: "forcedDisconnecting" },
      );
    }
    this.sendFinalActivityUpdates(activityUpdates);
    this.finishClosingSocket();
  }

  sendFinalActivityUpdates(activityUpdates: $ReadOnlyArray<ActivityUpdate>) {
    const { status } = this.props.connection;
    if (status === "connected") {
      this.sendAndHandleActivityUpdates(activityUpdates);
    }
  }

  finishClosingSocket() {
    if (this.inflightRequests.length > 0) {
      return;
    }
    this.props.dispatchActionPayload(
      updateConnectionStatusActionType,
      { status: "disconnected" },
    );
    if (this.socket && this.socket.readyState < 2) {
      // If it's not closing already, close it
      this.socket.close();
    }
    if (this.pingTimeoutID) {
      clearTimeout(this.pingTimeoutID);
      this.pingTimeoutID = null;
    }
    if (this.reopenConnectionAfterClosing) {
      this.reopenConnectionAfterClosing = false;
      if (this.props.active) {
        this.openSocket();
      }
    }
  }

  componentDidMount() {
    if (this.props.active) {
      this.openSocket();
    }
  }

  componentWillUnmount() {
    this.closeSocket([]);
  }

  componentDidUpdate(prevProps: Props) {
    const activityUpdates = [];
    if (this.props.activeThread !== prevProps.activeThread) {
      if (prevProps.activeThread) {
        activityUpdates.push({
          focus: false,
          threadID: prevProps.activeThread,
          latestMessage: prevProps.activeThreadLatestMessage,
        });
      }
      if (this.props.activeThread) {
        activityUpdates.push({
          focus: true,
          threadID: this.props.activeThread,
        });
      }
    }

    if (this.props.active && !prevProps.active) {
      this.openSocket();
    } else if (!this.props.active && prevProps.active) {
      this.closeSocket(activityUpdates);
    } else if (
      this.props.active &&
      prevProps.openSocket !== this.props.openSocket
    ) {
      // This case happens when the baseURL/urlPrefix is changed
      this.reopenConnectionAfterClosing = true;
      this.forceCloseSocket(activityUpdates);
    }

    if (activityUpdates.length > 0) {
      this.props.dispatchActionPayload(
        queueActivityUpdatesActionType,
        { activityUpdates },
      );
    }

    const { queuedClientResponses, connection } = this.props;
    const { status, queuedActivityUpdates } = connection;
    const {
      queuedClientResponses: prevClientResponses,
      connection: prevConnection,
    } = this.props;
    const {
      status: prevStatus,
      queuedActivityUpdates: prevActivityUpdates,
    } = prevConnection;

    if (status === "connected" && prevStatus !== "connected") {
      this.sendAndHandleQueuedClientResponses(queuedClientResponses);
    } else if (
      status === "connected" &&
      queuedClientResponses !== prevClientResponses
    ) {
      const prevResponses = new Set(prevClientResponses);
      const newResponses = queuedClientResponses.filter(
        response => !prevResponses.has(response),
      );
      this.sendAndHandleQueuedClientResponses(newResponses);
    }

    if (status === "connected" && prevStatus !== "connected") {
      this.sendAndHandleActivityUpdates(queuedActivityUpdates);
    } else if (
      status === "connected" &&
      queuedActivityUpdates !== prevActivityUpdates
    ) {
      const prevUpdates = new Set(prevActivityUpdates);
      const newUpdates = queuedActivityUpdates.filter(
        update => !prevUpdates.has(update),
      );
      this.sendAndHandleActivityUpdates(newUpdates);
    }
  }

  render() {
    return null;
  }

  sendMessage(message: ClientSocketMessage) {
    const socket = this.socket;
    invariant(socket, "should be set");
    socket.send(JSON.stringify(message));
  }

  messageFromEvent(event: MessageEvent): ?ServerSocketMessage {
    if (typeof event.data !== "string") {
      console.warn('socket received a non-string message');
      return null;
    }
    try {
      return JSON.parse(event.data);
    } catch (e) {
      console.warn(e);
      return null;
    }
  }

  receiveMessage = async (event: MessageEvent) => {
    const message = this.messageFromEvent(event);
    if (!message) {
      return;
    }
    // If we receive any message, that indicates that our connection is healthy,
    // so we can reset the ping timeout.
    this.resetPing();

    this.inflightRequests = resolveRequests(
      message,
      this.inflightRequests,
    );
    const { status } = this.props.connection;
    if (status === "disconnecting" || status === "forcedDisconnecting") {
      this.finishClosingSocket();
    }

    if (message.type === serverSocketMessageTypes.STATE_SYNC) {
      if (message.payload.type === stateSyncPayloadTypes.FULL) {
        const { sessionID, type, ...actionPayload } = message.payload;
        this.props.dispatchActionPayload(
          fullStateSyncActionType,
          actionPayload,
        );
        if (sessionID !== null && sessionID !== undefined) {
          this.props.dispatchActionPayload(
            setNewSessionActionType,
            {
              sessionChange: { cookieInvalidated: false, sessionID },
              error: null,
            },
          );
        }
      } else {
        const { type, ...actionPayload } = message.payload;
        this.props.dispatchActionPayload(
          incrementalStateSyncActionType,
          actionPayload,
        );
      }
      this.markSocketInitialized();
    } else if (message.type === serverSocketMessageTypes.REQUESTS) {
      const { serverRequests } = message.payload;
      this.processServerRequests(serverRequests);
      const clientResponses = this.props.getClientResponses(serverRequests);
      if (this.props.connection.status === "connected") {
        this.sendAndHandleClientResponsesToServerRequests(clientResponses);
      }
    } else if (message.type === serverSocketMessageTypes.ERROR) {
      const { message: errorMessage, payload } = message;
      if (payload) {
        console.warn(`socket sent error ${errorMessage} with payload`, payload);
      } else {
        console.warn(`socket sent error ${errorMessage}`);
      }
    } else if (message.type === serverSocketMessageTypes.AUTH_ERROR) {
      const { sessionChange } = message;
      const cookie = sessionChange ? sessionChange.cookie : this.props.cookie;

      const recoverySessionChange = await fetchNewCookieFromNativeCredentials(
        this.props.dispatch,
        cookie,
        this.props.urlPrefix,
        socketAuthErrorResolutionAttempt,
        this.props.logInExtraInfo,
      );

      if (!recoverySessionChange && sessionChange) {
        // This should only happen in the cookieSources.BODY (native) case when
        // the resolution attempt failed
        const { cookie, currentUserInfo } = sessionChange;
        this.props.dispatchActionPayload(
          setNewSessionActionType,
          {
            sessionChange: { cookieInvalidated: true, currentUserInfo, cookie },
            error: null,
          },
        );
      }
    }
  }

  onClose = (event: CloseEvent) => {
    const { status } = this.props.connection;
    if (
      status !== "disconnecting" &&
      status !== "forcedDisconnecting" &&
      status !== "disconnected"
    ) {
      registerActiveWebSocket(null);
    }
    if (status !== "disconnected") {
      this.props.dispatchActionPayload(
        updateConnectionStatusActionType,
        { status: "disconnected" },
      );
    }
    this.socket = null;
    this.stopPing();
  }

  sendInitialMessage = () => {
    const messageID = this.nextClientMessageID++;

    const nonActivityClientResponses = [ ...this.props.queuedClientResponses ];
    if (!this.initialPlatformDetailsSent) {
      this.initialPlatformDetailsSent = true;
      nonActivityClientResponses.push({
        type: serverRequestTypes.PLATFORM_DETAILS,
        platformDetails: getConfig().platformDetails,
      });
    }

    if (nonActivityClientResponses.length > 0) {
      const clientResponsesPromise = new Promise(
        (resolve, reject) => this.inflightRequests.push({
          expectedResponseType: serverSocketMessageTypes.REQUESTS,
          resolve,
          reject,
          messageID,
        }),
      );
      this.handleQueuedClientResponses(
        clientResponsesPromise,
        nonActivityClientResponses,
      );
    }

    const clientResponses = [ ...nonActivityClientResponses];
    const { queuedActivityUpdates } = this.props.connection;
    if (queuedActivityUpdates.length > 0) {
      clientResponses.push({
        type: serverRequestTypes.INITIAL_ACTIVITY_UPDATES,
        activityUpdates: queuedActivityUpdates,
      });
      const activityUpdatePromise = new Promise(
        (resolve, reject) => this.inflightRequests.push({
          expectedResponseType:
            serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE,
          resolve,
          reject,
          messageID,
        }),
      );
      this.handleActivityUpdates(activityUpdatePromise, queuedActivityUpdates);
    }

    const sessionState = this.props.sessionStateFunc();
    const { sessionIdentification } = this.props;
    const initialMessage = {
      type: clientSocketMessageTypes.INITIAL,
      id: messageID,
      payload: {
        clientResponses,
        sessionState,
        sessionIdentification,
      },
    };
    this.sendMessage(initialMessage);
  }

  stopPing() {
    if (this.pingTimeoutID) {
      clearTimeout(this.pingTimeoutID);
    }
  }

  resetPing() {
    this.stopPing();
    const socket = this.socket;
    this.pingTimeoutID = setTimeout(
      () => {
        if (this.socket === socket) {
          this.sendPing();
        }
      },
      pingFrequency,
    );
  }

  sendPing() {
    if (this.props.connection.status !== "connected") {
      // This generally shouldn't happen because anything that changes the
      // connection status should call stopPing(), but it's good to make sure
      return;
    }
    const messageID = this.nextClientMessageID++;
    // We don't add the request to this.inflightRequests because we don't need
    // the socket to wait for the response before closing, and we have nothing
    // that needs to happen after the response arrives
    this.sendMessage({
      type: clientSocketMessageTypes.PING,
      id: messageID,
    });
  }

  sendAndHandleQueuedClientResponses(
    clientResponses: $ReadOnlyArray<ClientResponse>,
  ) {
    if (clientResponses.length === 0) {
      return;
    }
    const promise = this.sendClientResponses(clientResponses);
    this.handleQueuedClientResponses(promise, clientResponses);
  }

  sendClientResponses(
    clientResponses: $ReadOnlyArray<ClientResponse>,
  ): Promise<RequestsServerSocketMessage> {
    const messageID = this.nextClientMessageID++;
    const promise = new Promise(
      (resolve, reject) => this.inflightRequests.push({
        expectedResponseType: serverSocketMessageTypes.REQUESTS,
        resolve,
        reject,
        messageID,
      }),
    );
    this.sendMessage({
      type: clientSocketMessageTypes.RESPONSES,
      id: messageID,
      payload: { clientResponses },
    });
    return promise;
  }

  async handleQueuedClientResponses(
    promise: Promise<RequestsServerSocketMessage>,
    clientResponses: $ReadOnlyArray<ClientResponse>,
    retriesLeft: number = 1,
  ): Promise<void> {
    try {
      const response = await promise;
      this.props.dispatchActionPayload(
        clearDeliveredClientResponsesActionType,
        { clientResponses },
      );
    } catch (e) {
      if (!(e instanceof ServerError)) {
        console.warn(e);
      }
      if (
        !(e instanceof ServerError) ||
        retriesLeft === 0 ||
        this.props.connection.status !== "connected"
      ) {
        this.props.dispatchActionPayload(
          clearDeliveredClientResponsesActionType,
          { clientResponses },
        );
      } else {
        const newPromise = this.sendClientResponses(clientResponses);
        await this.handleQueuedClientResponses(
          newPromise,
          clientResponses,
          retriesLeft - 1,
        );
      }
    }
  }

  sendAndHandleClientResponsesToServerRequests(
    clientResponses: $ReadOnlyArray<ClientResponse>,
  ) {
    if (clientResponses.length === 0) {
      return;
    }
    const promise = this.sendClientResponses(clientResponses);
    this.handleClientResponsesToServerRequests(promise, clientResponses);
  }

  async handleClientResponsesToServerRequests(
    promise: Promise<RequestsServerSocketMessage>,
    clientResponses: $ReadOnlyArray<ClientResponse>,
    retriesLeft: number = 1,
  ): Promise<void> {
    try {
      const response = await promise;
    } catch (e) {
      if (!(e instanceof ServerError)) {
        console.warn(e);
      }
      if (
        e instanceof ServerError &&
        retriesLeft > 0 &&
        this.props.connection.status === "connected"
      ) {
        const newPromise = this.sendClientResponses(clientResponses);
        await this.handleClientResponsesToServerRequests(
          newPromise,
          clientResponses,
          retriesLeft - 1,
        );
      }
    }
  }

  processServerRequests(serverRequests: $ReadOnlyArray<ServerRequest>) {
    if (serverRequests.length === 0) {
      return;
    }
    this.props.dispatchActionPayload(
      processServerRequestsActionType,
      { serverRequests },
    );
  }

  sendAndHandleActivityUpdates(
    activityUpdates: $ReadOnlyArray<ActivityUpdate>,
  ) {
    if (activityUpdates.length === 0) {
      return;
    }
    const promise = this.sendActivityUpdates(activityUpdates);
    this.handleActivityUpdates(promise, activityUpdates);
  }

  sendActivityUpdates(
    activityUpdates: $ReadOnlyArray<ActivityUpdate>
  ): Promise<ActivityUpdateResponseServerSocketMessage> {
    const messageID = this.nextClientMessageID++;
    const promise = new Promise(
      (resolve, reject) => this.inflightRequests.push({
        expectedResponseType:
          serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE,
        resolve,
        reject,
        messageID,
      }),
    );
    this.sendMessage({
      type: clientSocketMessageTypes.ACTIVITY_UPDATES,
      id: messageID,
      payload: { activityUpdates },
    });
    return promise;
  }

  async handleActivityUpdates(
    promise: Promise<ActivityUpdateResponseServerSocketMessage>,
    activityUpdates: $ReadOnlyArray<ActivityUpdate>,
    retriesLeft: number = 1,
  ): Promise<void> {
    try {
      const response = await promise;
      this.props.dispatchActionPayload(
        activityUpdateSuccessActionType,
        { activityUpdates, result: response.payload },
      );
    } catch (e) {
      if (!(e instanceof ServerError)) {
        console.warn(e);
      }
      if (
        !(e instanceof ServerError) ||
        retriesLeft === 0 ||
        this.props.connection.status !== "connected"
      ) {
        this.props.dispatchActionPayload(
          activityUpdateFailedActionType,
          { activityUpdates },
        );
      } else {
        const newPromise = this.sendActivityUpdates(activityUpdates);
        await this.handleActivityUpdates(
          newPromise,
          activityUpdates,
          retriesLeft - 1,
        );
      }
    }
  }

}

export default Socket;
