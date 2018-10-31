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
  type ServerSocketMessageType,
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
  type PongServerSocketMessage,
  type StateSyncServerSocketMessage,
} from '../types/socket-types';
import { InflightRequests, SocketTimeout } from './inflight-requests';
import type { ActivityUpdate } from '../types/activity-types';
import type { Dispatch } from '../types/redux-types';
import type { DispatchActionPayload } from '../utils/action-utils';
import type { LogInExtraInfo } from '../types/account-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import _debounce from 'lodash/fp/debounce';

import { getConfig } from '../utils/config';
import {
  registerActiveWebSocket,
  setNewSessionActionType,
  fetchNewCookieFromNativeCredentials,
} from '../utils/action-utils';
import { socketAuthErrorResolutionAttempt } from '../actions/user-actions';
import { ServerError } from '../utils/errors';
import { pingFrequency } from '../shared/timeouts';
import { promiseAll } from '../utils/promises';

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
  inflightRequests: ?InflightRequests;
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
        console.log(`this.socket seems open, but Redux thinks it's ${status}`);
      }
    }
    this.props.dispatchActionPayload(
      updateConnectionStatusActionType,
      { status: "connecting" },
    );
    const socket = this.props.openSocket();
    socket.onopen = () => {
      if (this.socket === socket) {
        this.initializeSocket();
      }
    };
    socket.onmessage = this.receiveMessage;
    socket.onclose = (event: CloseEvent) => {
      if (this.socket === socket) {
        this.onClose(event);
      }
    };
    this.socket = socket;
    this.inflightRequests = new InflightRequests(
      () => {
        if (this.socket === socket) {
          this.handleTimeout();
        }
      },
    );
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
    if (this.inflightRequests && !this.inflightRequests.allRequestsResolved) {
      return;
    }
    this.props.dispatchActionPayload(
      updateConnectionStatusActionType,
      { status: "disconnected" },
    );
    registerActiveWebSocket(null);
    if (this.socket && this.socket.readyState < 2) {
      // If it's not closing already, close it
      this.socket.close();
      this.socket = null;
    }
    this.stopPing();
    this.inflightRequests = null;
    if (this.reopenConnectionAfterClosing) {
      this.reopenConnectionAfterClosing = false;
      if (this.props.active) {
        this.openSocket();
      }
    }
  }

  reconnect = _debounce(2000)(() => {
    this.openSocket();
  })

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

    const { queuedClientResponses, connection } = this.props;
    const { status, queuedActivityUpdates } = connection;
    const {
      queuedClientResponses: prevClientResponses,
      connection: prevConnection,
    } = prevProps;
    const {
      status: prevStatus,
      queuedActivityUpdates: prevActivityUpdates,
    } = prevConnection;

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
    } else if (
      this.props.active &&
      status === "disconnected" &&
      prevStatus !== "disconnected"
    ) {
      this.reconnect();
    }

    if (activityUpdates.length > 0) {
      this.props.dispatchActionPayload(
        queueActivityUpdatesActionType,
        { activityUpdates },
      );
    }

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
      console.log('socket received a non-string message');
      return null;
    }
    try {
      return JSON.parse(event.data);
    } catch (e) {
      console.log(e);
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

    invariant(this.inflightRequests, "inflightRequests should exist");
    this.inflightRequests.resolveRequestsForMessage(message);
    const { status } = this.props.connection;
    if (status === "disconnecting" || status === "forcedDisconnecting") {
      this.finishClosingSocket();
    }

    if (message.type === serverSocketMessageTypes.ERROR) {
      const { message: errorMessage, payload } = message;
      if (payload) {
        console.log(`socket sent error ${errorMessage} with payload`, payload);
      } else {
        console.log(`socket sent error ${errorMessage}`);
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
    if (this.inflightRequests) {
      this.inflightRequests.rejectAll(new Error("socket closed"));
      this.inflightRequests = null;
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

  handleTimeout() {
    registerActiveWebSocket(null);
    this.inflightRequests = null;
    const { status } = this.props.connection;
    if (this.socket && this.socket.readyState < 2) {
      if (status !== "disconnecting") {
        this.props.dispatchActionPayload(
          updateConnectionStatusActionType,
          { status: "disconnecting" },
        );
      }
      // We just call close, onClose will handle the rest
      this.socket.close();
    } else {
      if (status !== "disconnected") {
        this.props.dispatchActionPayload(
          updateConnectionStatusActionType,
          { status: "disconnected" },
        );
      }
      this.socket = null;
      this.stopPing();
    }
  }

  async sendInitialMessage() {
    const { inflightRequests } = this;
    invariant(inflightRequests, "inflightRequests should exist");
    const messageID = this.nextClientMessageID++;
    const promises = {};

    const nonActivityClientResponses = [ ...this.props.queuedClientResponses ];
    if (!this.initialPlatformDetailsSent) {
      this.initialPlatformDetailsSent = true;
      nonActivityClientResponses.push({
        type: serverRequestTypes.PLATFORM_DETAILS,
        platformDetails: getConfig().platformDetails,
      });
    }

    if (nonActivityClientResponses.length > 0) {
      promises.serverRequestMessage = inflightRequests.fetchResponse(
        messageID,
        serverSocketMessageTypes.REQUESTS,
      );
    }

    const clientResponses = [ ...nonActivityClientResponses];
    const { queuedActivityUpdates } = this.props.connection;
    if (queuedActivityUpdates.length > 0) {
      clientResponses.push({
        type: serverRequestTypes.INITIAL_ACTIVITY_UPDATES,
        activityUpdates: queuedActivityUpdates,
      });
      promises.activityUpdateMessage = inflightRequests.fetchResponse(
        messageID,
        serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE,
      );
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

    promises.stateSyncMessage = inflightRequests.fetchResponse(
      messageID,
      serverSocketMessageTypes.STATE_SYNC,
    );

    const {
      stateSyncMessage,
      activityUpdateMessage,
      serverRequestMessage,
    } = await promiseAll(promises);

    if (serverRequestMessage) {
      this.props.dispatchActionPayload(
        clearDeliveredClientResponsesActionType,
        { clientResponses: nonActivityClientResponses },
      );
      const { serverRequests } = serverRequestMessage.payload;
      this.processServerRequests(serverRequests);
    }
    if (activityUpdateMessage) {
      this.props.dispatchActionPayload(
        activityUpdateSuccessActionType,
        {
          activityUpdates: queuedActivityUpdates,
          result: activityUpdateMessage.payload,
        },
      );
    }

    if (stateSyncMessage.payload.type === stateSyncPayloadTypes.FULL) {
      const { sessionID, type, ...actionPayload } = stateSyncMessage.payload;
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
      const { type, ...actionPayload } = stateSyncMessage.payload;
      this.props.dispatchActionPayload(
        incrementalStateSyncActionType,
        actionPayload,
      );
    }

    this.markSocketInitialized();
  }

  initializeSocket = async (
    retriesLeft: number = 1,
  ) => {
    try {
      await this.sendInitialMessage();
    } catch (e) {
      console.log(e);
      if (
        e instanceof SocketTimeout ||
        this.props.connection.status !== "connecting"
      ) {
        // This indicates that the socket will be closed. Do nothing, since the
        // connection status update will trigger a reconnect.
      } else if (
        retriesLeft === 0 ||
        (e instanceof ServerError && e.message !== "unknown_error")
      ) {
        if (this.socket) {
          this.socket.close();
        }
      } else {
        await this.initializeSocket(retriesLeft - 1);
      }
    }
  }

  stopPing() {
    if (this.pingTimeoutID) {
      clearTimeout(this.pingTimeoutID);
      this.pingTimeoutID = null;
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

  async sendPing() {
    if (this.props.connection.status !== "connected") {
      // This generally shouldn't happen because anything that changes the
      // connection status should call stopPing(), but it's good to make sure
      return;
    }
    const messageID = this.nextClientMessageID++;
    this.sendMessage({
      type: clientSocketMessageTypes.PING,
      id: messageID,
    });
    try {
      invariant(this.inflightRequests, "inflightRequests should exist");
      await this.inflightRequests.fetchResponse(
        messageID,
        serverSocketMessageTypes.PONG,
      );
    } catch (e) {
      console.log(e);
    }
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
    invariant(this.inflightRequests, "inflightRequests should exist");
    const promise = this.inflightRequests.fetchResponse(
      messageID,
      serverSocketMessageTypes.REQUESTS,
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
      const { serverRequests } = response.payload;
      this.processServerRequests(serverRequests);
    } catch (e) {
      console.log(e);
      if (
        e instanceof SocketTimeout ||
        this.props.connection.status !== "connected"
      ) {
        // This indicates that the socket will be closed. Do nothing, since when
        // it will reopen it will send all the queued ClientResponses again.
      } else if (
        retriesLeft === 0 ||
        (e instanceof ServerError && e.message !== "unknown_error")
      ) {
        // We're giving up on these ClientResponses, as they seem to cause the
        // server to error...
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
      const { serverRequests } = response.payload;
      this.processServerRequests(serverRequests);
    } catch (e) {
      console.log(e);
      if (
        !(e instanceof SocketTimeout) &&
        (!(e instanceof ServerError) || e.message === "unknown_error") &&
        retriesLeft > 0 &&
        this.props.connection.status === "connected"
      ) {
        // We'll only retry if the connection is healthy and the error is either
        // an unknown_error ServerError or something is neither a ServerError
        // nor a SocketTimeout.
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
    const clientResponses = this.props.getClientResponses(serverRequests);
    if (this.props.connection.status === "connected") {
      this.sendAndHandleClientResponsesToServerRequests(clientResponses);
    }
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
    invariant(this.inflightRequests, "inflightRequests should exist");
    const promise = this.inflightRequests.fetchResponse(
      messageID,
      serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE,
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
      console.log(e);
      if (
        e instanceof SocketTimeout ||
        this.props.connection.status !== "connected"
      ) {
        // This indicates that the socket will be closed. Do nothing, since when
        // it will reopen it will send all the queued activity updates again.
      } else if (
        retriesLeft === 0 ||
        (e instanceof ServerError && e.message !== "unknown_error")
      ) {
        // We're giving up on these activity updates, as they seem to cause the
        // server to error...
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
