// @flow

import {
  serverRequestTypes,
  type ClientResponse,
  type ServerRequest,
  clearDeliveredClientResponsesActionType,
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
  activityUpdateSuccessActionType,
  type InitialClientSocketMessage,
  type ResponsesClientSocketMessage,
  type ActivityUpdatesClientSocketMessage,
  type PingClientSocketMessage,
  type AckUpdatesClientSocketMessage,
  type ClientSocketMessageWithoutID,
  type SocketListener,
  type ConnectionStatus,
} from '../types/socket-types';
import type { Dispatch } from '../types/redux-types';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from '../utils/action-utils';
import type { LogOutResult } from '../types/account-types';
import type { CalendarQuery } from '../types/entry-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import _debounce from 'lodash/debounce';

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
import { InflightRequests, SocketTimeout } from './inflight-requests';
import ActivityHandler from './activity-handler.react';
import RequestResponseHandler from './request-response-handler.react';
import UpdateHandler from './update-handler.react';
import MessageHandler from './message-handler.react';
import CalendarQueryHandler from './calendar-query-handler.react';
import { logOutActionTypes } from '../actions/user-actions';

type Props = {|
  // Redux state
  active: bool,
  openSocket: () => WebSocket,
  queuedClientResponses: $ReadOnlyArray<ClientResponse>,
  getClientResponses: (
    activeServerRequests: $ReadOnlyArray<ServerRequest>,
  ) => $ReadOnlyArray<ClientResponse>,
  activeThread: ?string,
  sessionStateFunc: () => SessionState,
  sessionIdentification: SessionIdentification,
  cookie: ?string,
  urlPrefix: string,
  connection: ConnectionInfo,
  currentCalendarQuery: () => CalendarQuery,
  // Redux dispatch functions
  dispatch: Dispatch,
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  logOut: () => Promise<LogOutResult>,
|};
type State = {|
  inflightRequests: ?InflightRequests,
|};
class Socket extends React.PureComponent<Props, State> {

  static propTypes = {
    openSocket: PropTypes.func.isRequired,
    active: PropTypes.bool.isRequired,
    queuedClientResponses: PropTypes.arrayOf(clientResponsePropType).isRequired,
    getClientResponses: PropTypes.func.isRequired,
    activeThread: PropTypes.string,
    sessionStateFunc: PropTypes.func.isRequired,
    sessionIdentification: sessionIdentificationPropType.isRequired,
    cookie: PropTypes.string,
    urlPrefix: PropTypes.string.isRequired,
    connection: connectionInfoPropType.isRequired,
    currentCalendarQuery: PropTypes.func.isRequired,
    dispatch: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    logOut: PropTypes.func.isRequired,
  };
  state = {
    inflightRequests: null,
  };
  socket: ?WebSocket;
  nextClientMessageID = 0;
  listeners: Set<SocketListener> = new Set();
  pingTimeoutID: ?TimeoutID
  initialPlatformDetailsSent = false;
  reopenConnectionAfterClosing = false;

  openSocket(newStatus: ConnectionStatus) {
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
      { status: newStatus },
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
    this.setState({
      inflightRequests: new InflightRequests(
        () => {
          if (this.socket === socket) {
            this.handleTimeout();
          }
        },
      ),
    });
  }

  markSocketInitialized() {
    registerActiveWebSocket(this.socket);
    this.props.dispatchActionPayload(
      updateConnectionStatusActionType,
      { status: "connected" },
    );
    this.resetPing();
  }

  closeSocket() {
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
    this.finishClosingSocket();
  }

  forceCloseSocket() {
    registerActiveWebSocket(null);
    this.stopPing();
    const { status } = this.props.connection;
    if (status !== "forcedDisconnecting" && status !== "disconnected") {
      this.props.dispatchActionPayload(
        updateConnectionStatusActionType,
        { status: "forcedDisconnecting" },
      );
    }
    this.finishClosingSocket();
  }

  finishClosingSocket() {
    const { inflightRequests } = this.state;
    if (inflightRequests && !inflightRequests.allRequestsResolved) {
      return;
    }
    registerActiveWebSocket(null);
    if (this.socket && this.socket.readyState < 2) {
      // If it's not closing already, close it
      this.socket.close();
    }
    this.socket = null;
    this.stopPing();
    this.props.dispatchActionPayload(
      updateConnectionStatusActionType,
      { status: "disconnected" },
    );
    this.setState({ inflightRequests: null });
    if (this.reopenConnectionAfterClosing) {
      this.reopenConnectionAfterClosing = false;
      if (this.props.active) {
        this.openSocket("connecting");
      }
    }
  }

  reconnect = _debounce(
    () => this.openSocket("reconnecting"),
    2000,
    { leading: true, trailing: true },
  )

  componentDidMount() {
    if (this.props.active) {
      this.openSocket("connecting");
    }
  }

  componentWillUnmount() {
    this.closeSocket();
    this.reconnect.cancel();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.active && !prevProps.active) {
      this.openSocket("connecting");
    } else if (!this.props.active && prevProps.active) {
      this.closeSocket();
    } else if (
      this.props.active &&
      prevProps.openSocket !== this.props.openSocket
    ) {
      // This case happens when the baseURL/urlPrefix is changed
      this.reopenConnectionAfterClosing = true;
      this.forceCloseSocket();
    } else if (
      this.props.active &&
      this.props.connection.status === "disconnected" &&
      prevProps.connection.status !== "disconnected"
    ) {
      this.reconnect();
    }
  }

  render() {
    return (
      <React.Fragment>
        <ActivityHandler
          activeThread={this.props.activeThread}
          inflightRequests={this.state.inflightRequests}
          sendMessage={this.sendMessageWithoutID}
        />
        <RequestResponseHandler
          inflightRequests={this.state.inflightRequests}
          sendMessage={this.sendMessageWithoutID}
          addListener={this.addListener}
          removeListener={this.removeListener}
          getClientResponses={this.props.getClientResponses}
          currentCalendarQuery={this.props.currentCalendarQuery}
        />
        <UpdateHandler
          sendMessage={this.sendMessageWithoutID}
          addListener={this.addListener}
          removeListener={this.removeListener}
        />
        <MessageHandler
          addListener={this.addListener}
          removeListener={this.removeListener}
        />
        <CalendarQueryHandler />
      </React.Fragment>
    );
  }

  sendMessageWithoutID = (message: ClientSocketMessageWithoutID) => {
    const id = this.nextClientMessageID++;
    // These conditions all do the same thing and the runtime checks are only
    // necessary for Flow
    if (message.type === clientSocketMessageTypes.INITIAL) {
      this.sendMessage(({ ...message, id }: InitialClientSocketMessage));
    } else if (message.type === clientSocketMessageTypes.RESPONSES) {
      this.sendMessage(({ ...message, id }: ResponsesClientSocketMessage));
    } else if (message.type === clientSocketMessageTypes.ACTIVITY_UPDATES) {
      this.sendMessage(({
        ...message,
        id,
      }: ActivityUpdatesClientSocketMessage));
    } else if (message.type === clientSocketMessageTypes.PING) {
      this.sendMessage(({ ...message, id }: PingClientSocketMessage));
    } else if (message.type === clientSocketMessageTypes.ACK_UPDATES) {
      this.sendMessage(({ ...message, id }: AckUpdatesClientSocketMessage));
    }
    return id;
  }

  sendMessage(message: ClientSocketMessage) {
    const socket = this.socket;
    invariant(socket, "should be set");
    socket.send(JSON.stringify(message));
  }

  static messageFromEvent(event: MessageEvent): ?ServerSocketMessage {
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
    const message = Socket.messageFromEvent(event);
    if (!message) {
      return;
    }
    // If we receive any message, that indicates that our connection is healthy,
    // so we can reset the ping timeout.
    this.resetPing();

    invariant(this.state.inflightRequests, "inflightRequests should exist");
    this.state.inflightRequests.resolveRequestsForMessage(message);
    const { status } = this.props.connection;
    if (status === "disconnecting" || status === "forcedDisconnecting") {
      this.finishClosingSocket();
    }

    for (let listener of this.listeners) {
      listener(message);
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
      } else if (!recoverySessionChange) {
        this.props.dispatchActionPromise(
          logOutActionTypes,
          this.props.logOut(),
        );
      }
    }
  }

  addListener = (listener: SocketListener) => {
    this.listeners.add(listener);
  }

  removeListener = (listener: SocketListener) => {
    this.listeners.delete(listener);
  }

  onClose = (event: CloseEvent) => {
    const { status } = this.props.connection;
    this.socket = null;
    this.stopPing();
    if (
      status !== "disconnecting" &&
      status !== "forcedDisconnecting" &&
      status !== "disconnected"
    ) {
      registerActiveWebSocket(null);
    }
    if (this.state.inflightRequests) {
      this.state.inflightRequests.rejectAll(new Error("socket closed"));
      this.setState({ inflightRequests: null });
    }
    if (status !== "disconnected") {
      this.props.dispatchActionPayload(
        updateConnectionStatusActionType,
        { status: "disconnected" },
      );
    }
  }

  handleTimeout() {
    registerActiveWebSocket(null);
    this.setState({ inflightRequests: null });
    const { status } = this.props.connection;
    if (this.socket && this.socket.readyState < 2) {
      // We just call close, onClose will handle the rest
      this.socket.close();
      if (status !== "disconnecting") {
        this.props.dispatchActionPayload(
          updateConnectionStatusActionType,
          { status: "disconnecting" },
        );
      }
    } else {
      this.socket = null;
      this.stopPing();
      if (status !== "disconnected") {
        this.props.dispatchActionPayload(
          updateConnectionStatusActionType,
          { status: "disconnected" },
        );
      }
    }
  }

  async sendInitialMessage() {
    const { inflightRequests } = this.state;
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

    const currentAsOf =
      stateSyncMessage.payload.type === stateSyncPayloadTypes.FULL
        ? stateSyncMessage.payload.updatesCurrentAsOf
        : stateSyncMessage.payload.updatesResult.currentAsOf;
    this.sendMessageWithoutID({
      type: clientSocketMessageTypes.ACK_UPDATES,
      payload: { currentAsOf },
    });

    this.markSocketInitialized();
  }

  initializeSocket = async (
    retriesLeft: number = 1,
  ) => {
    try {
      await this.sendInitialMessage();
    } catch (e) {
      console.log(e);
      const { status } = this.props.connection;
      if (
        e instanceof SocketTimeout ||
        (status !== "connecting" && status !== "reconnecting")
      ) {
        // This indicates that the socket will be closed. Do nothing, since the
        // connection status update will trigger a reconnect.
      } else if (
        retriesLeft === 0 ||
        (e instanceof ServerError && e.message !== "unknown_error")
      ) {
        if (e.message === "not_logged_in") {
          this.props.dispatchActionPromise(
            logOutActionTypes,
            this.props.logOut(),
          );
        } else if (this.socket) {
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
    const messageID = this.sendMessageWithoutID({
      type: clientSocketMessageTypes.PING,
    });
    try {
      invariant(this.state.inflightRequests, "inflightRequests should exist");
      await this.state.inflightRequests.fetchResponse(
        messageID,
        serverSocketMessageTypes.PONG,
      );
    } catch (e) {
      console.log(e);
    }
  }

}

export default Socket;
