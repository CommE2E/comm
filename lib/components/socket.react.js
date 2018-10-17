// @flow

import {
  serverRequestTypes,
  type ClientResponse,
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

const fullStateSyncActionPayload = "FULL_STATE_SYNC";
const incrementalStateSyncActionPayload = "INCREMENTAL_STATE_SYNC";

type Props = {|
  active: bool,
  // Redux state
  openSocket: () => WebSocket,
  clientResponses: $ReadOnlyArray<ClientResponse>,
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
    clientResponses: PropTypes.arrayOf(clientResponsePropType).isRequired,
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

  openSocket() {
    if (this.socket) {
      this.socket.close();
    }
    const socket = this.props.openSocket();
    socket.onopen = this.sendInitialMessage;
    socket.onmessage = this.receiveMessage;
    socket.onclose = this.onClose;
    this.socket = socket;
  }

  closeSocket() {
    registerActiveWebSocket(null);
    if (this.socket) {
      if (this.socket.readyState < 2) {
        // If it's not closing already, close it
        this.socket.close();
      }
      this.socket = null;
    }
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
      // Once we receive the STATE_SYNC, the socket is ready for use
      registerActiveWebSocket(this.socket);
    } else if (message.type === serverSocketMessageTypes.REQUESTS) {
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
    this.closeSocket();
  }

  sendInitialMessage = () => {
    const clientResponses = [ ...this.props.clientResponses ];
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

    const sessionState = this.props.sessionStateFunc();
    const { sessionIdentification } = this.props;
    const initialMessage = {
      type: clientSocketMessageTypes.INITIAL,
      id: this.nextClientMessageID++,
      payload: {
        clientResponses,
        sessionState,
        sessionIdentification,
      },
    };
    this.sendMessage(initialMessage);
  }

}

export default Socket;
