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
} from '../types/socket-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { getConfig } from '../utils/config';
import { registerActiveWebSocket } from '../utils/action-utils';

type Props = {|
  active: bool,
  // Redux state
  openSocket: () => WebSocket,
  clientResponses: $ReadOnlyArray<ClientResponse>,
  activeThread: ?string,
  sessionStateFunc: () => SessionState,
  sessionIdentification: SessionIdentification,
|};
class Socket extends React.PureComponent<Props> {

  static propTypes = {
    openSocket: PropTypes.func.isRequired,
    active: PropTypes.bool.isRequired,
    clientResponses: PropTypes.arrayOf(clientResponsePropType).isRequired,
    activeThread: PropTypes.string,
    sessionStateFunc: PropTypes.func.isRequired,
    sessionIdentification: sessionIdentificationPropType.isRequired,
  };
  socket: ?WebSocket;
  initialPlatformDetailsSent = false;
  nextClientMessageID = 0;

  openSocket() {
    if (this.socket) {
      this.socket.close();
    }
    this.socket = this.props.openSocket();
    this.socket.addEventListener('open', this.sendInitialMessage);
    registerActiveWebSocket(this.socket);
  }

  closeSocket() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    registerActiveWebSocket(null);
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
