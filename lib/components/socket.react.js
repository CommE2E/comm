// @flow

import {
  type ServerRequest,
  serverRequestTypes,
  type ClientResponse,
  clearDeliveredClientResponsesActionType,
  processServerRequestsActionType,
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
  fullStateSyncActionPayload,
  incrementalStateSyncActionPayload,
} from '../types/socket-types';
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

type SentClientResponse = { clientResponse: ClientResponse, messageID: number };

type Props = {|
  active: bool,
  // Redux state
  openSocket: () => WebSocket,
  getClientResponses: (
    activeServerRequests?: $ReadOnlyArray<ServerRequest>,
  ) => $ReadOnlyArray<ClientResponse>,
  activeThread: ?string,
  sessionStateFunc: () => SessionState,
  sessionIdentification: SessionIdentification,
  cookie: ?string,
  urlPrefix: string,
  logInExtraInfo: () => LogInExtraInfo,
  // Redux dispatch functions
  dispatch: Dispatch,
  dispatchActionPayload: DispatchActionPayload,
|};
class Socket extends React.PureComponent<Props> {

  static propTypes = {
    openSocket: PropTypes.func.isRequired,
    active: PropTypes.bool.isRequired,
    getClientResponses: PropTypes.func.isRequired,
    activeThread: PropTypes.string,
    sessionStateFunc: PropTypes.func.isRequired,
    sessionIdentification: sessionIdentificationPropType.isRequired,
    cookie: PropTypes.string,
    urlPrefix: PropTypes.string.isRequired,
    logInExtraInfo: PropTypes.func.isRequired,
    dispatch: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  socket: ?WebSocket;
  initialPlatformDetailsSent = false;
  nextClientMessageID = 0;
  socketInitializedAndActive = false;
  clientResponsesInTransit: SentClientResponse[] = [];

  openSocket() {
    if (this.socket) {
      this.socket.close();
    }
    const socket = this.props.openSocket();
    socket.onopen = this.sendInitialMessage;
    socket.onmessage = this.receiveMessage;
    socket.onclose = this.onClose;
    this.socket = socket;
    this.clientResponsesInTransit = [];
  }

  closeSocket() {
    this.socketInitializedAndActive = false;
    registerActiveWebSocket(null);
    if (this.socket) {
      if (this.socket.readyState < 2) {
        // If it's not closing already, close it
        this.socket.close();
      }
      this.socket = null;
    }
  }

  markSocketInitialized() {
    this.socketInitializedAndActive = true;
    registerActiveWebSocket(this.socket);
    // In case any ClientResponses have accumulated in Redux while we were
    // initializing
    this.possiblySendReduxClientResponses();
  }

  componentDidMount() {
    if (this.props.active) {
      this.openSocket();
    }
  }

  componentWillUnmount() {
    this.closeSocket();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.active && !prevProps.active) {
      this.openSocket();
    } else if (!this.props.active && prevProps.active) {
      this.closeSocket();
    } else if (
      this.props.active &&
      prevProps.openSocket !== this.props.openSocket
    ) {
      // This case happens when the baseURL/urlPrefix is changed. Not sure if
      // the closeSocket() call is entirely necessary. Long-term we will update
      // this logic to retry in-flight requests anyways, so we can figure out
      // then.
      this.closeSocket();
      this.openSocket();
    }

    if (
      this.socketInitializedAndActive &&
      this.props.getClientResponses !== prevProps.getClientResponses
    ) {
      this.possiblySendReduxClientResponses();
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
    if (message.type === serverSocketMessageTypes.STATE_SYNC) {
      this.clearDeliveredClientResponses(message.responseTo);
      if (message.payload.type === stateSyncPayloadTypes.FULL) {
        const { sessionID, type, ...actionPayload } = message.payload;
        this.props.dispatchActionPayload(
          fullStateSyncActionPayload,
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
          incrementalStateSyncActionPayload,
          actionPayload,
        );
      }
      this.markSocketInitialized();
    } else if (message.type === serverSocketMessageTypes.REQUESTS) {
      this.clearDeliveredClientResponses(message.responseTo);
      const { serverRequests } = message.payload;
      this.processServerRequests(serverRequests);
      const clientResponses = this.props.getClientResponses(serverRequests);
      this.sendClientResponses(clientResponses);
    } else if (message.type === serverSocketMessageTypes.ERROR) {
      const { message: errorMessage, payload, responseTo } = message;
      if (responseTo !== null && responseTo !== undefined) {
        this.clearDeliveredClientResponses(responseTo);
      }
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
    this.closeSocket();
  }

  sendInitialMessage = () => {
    const baseClientResponses = this.props.getClientResponses();
    const clientResponses = [ ...baseClientResponses ];
    if (this.props.activeThread) {
      clientResponses.push({
        type: serverRequestTypes.INITIAL_ACTIVITY_UPDATES,
        activityUpdates: [{
          focus: true,
          threadID: this.props.activeThread,
        }],
      });
    }
    const responsesIncludePlatformDetails = clientResponses.some(
      response => response.type === serverRequestTypes.PLATFORM_DETAILS,
    );
    if (!this.initialPlatformDetailsSent) {
      this.initialPlatformDetailsSent = true;
      if (!responsesIncludePlatformDetails) {
        clientResponses.push({
          type: serverRequestTypes.PLATFORM_DETAILS,
          platformDetails: getConfig().platformDetails,
        });
      }
    }

    const messageID = this.nextClientMessageID++;
    this.markClientResponsesAsInTransit(clientResponses, messageID);

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

  possiblySendReduxClientResponses() {
    const clientResponses = this.props.getClientResponses();
    this.sendClientResponses(clientResponses);
  }

  sendClientResponses(clientResponses: $ReadOnlyArray<ClientResponse>) {
    if (clientResponses.length === 0) {
      return;
    }
    const filtered = this.filterInTransitClientResponses(clientResponses);
    if (filtered.length === 0) {
      return;
    }
    const messageID = this.nextClientMessageID++;
    this.markClientResponsesAsInTransit(filtered, messageID);
    this.sendMessage({
      type: clientSocketMessageTypes.RESPONSES,
      id: messageID,
      payload: { clientResponses: filtered },
    });
  }

  markClientResponsesAsInTransit(
    clientResponses: $ReadOnlyArray<ClientResponse>,
    messageID: number,
  ) {
    // We want to avoid double-sending the ClientResponses we cache in Redux
    // (namely, the inconsistency responses), so we mark them as in-transit once
    // they're sent
    for (let clientResponse of clientResponses) {
      this.clientResponsesInTransit.push({ clientResponse, messageID });
    }
  }

  filterInTransitClientResponses(
    clientResponses: $ReadOnlyArray<ClientResponse>,
  ): ClientResponse[] {
    const filtered = [];
    for (let clientResponse of clientResponses) {
      let inTransit = false;
      for (let sentClientResponse of this.clientResponsesInTransit) {
        const { clientResponse: inTransitClientResponse } = sentClientResponse;
        if (inTransitClientResponse === clientResponse) {
          inTransit = true;
          break;
        }
      }
      if (!inTransit) {
        filtered.push(clientResponse);
      }
    }
    return filtered;
  }

  clearDeliveredClientResponses(messageID: number) {
    const deliveredClientResponses = [], clientResponsesStillInTransit = [];
    for (let sentClientResponse of this.clientResponsesInTransit) {
      if (sentClientResponse.messageID === messageID) {
        deliveredClientResponses.push(sentClientResponse.clientResponse);
      } else {
        clientResponsesStillInTransit.push(sentClientResponse);
      }
    }
    if (deliveredClientResponses.length === 0) {
      return;
    }
    // Note: it's hypothetically possible for something to call
    // possiblySendReduxClientResponses after we update
    // this.clientResponsesInTransit below but before the Redux action below
    // propagates to this component. In that case, we could double-send some
    // Redux-cached ClientResponses. Since right now only inconsistency
    // responses are Redux-cached, and the server knows how to dedup those so
    // that the transaction is idempotent, we're not going to worry about it.
    this.props.dispatchActionPayload(
      clearDeliveredClientResponsesActionType,
      { clientResponses: deliveredClientResponses },
    );
    this.clientResponsesInTransit = clientResponsesStillInTransit;
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

}

export default Socket;
