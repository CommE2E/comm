// @flow

import {
  type RequestsServerSocketMessage,
  type ServerSocketMessage,
  clientSocketMessageTypes,
  serverSocketMessageTypes,
  type ClientSocketMessageWithoutID,
  type SocketListener,
  type ConnectionInfo,
  connectionInfoPropType,
} from '../types/socket-types';
import {
  processServerRequestsActionType,
  type ClientClientResponse,
  type ServerRequest,
} from '../types/request-types';
import type { CalendarQuery } from '../types/entry-types';
import type { DispatchActionPayload } from '../utils/action-utils';
import type { AppState } from '../types/redux-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { connect } from '../utils/redux-utils';
import { InflightRequests, SocketTimeout } from './inflight-requests';
import { ServerError } from '../utils/errors';

type Props = {|
  inflightRequests: ?InflightRequests,
  sendMessage: (message: ClientSocketMessageWithoutID) => number,
  addListener: (listener: SocketListener) => void,
  removeListener: (listener: SocketListener) => void,
  getClientResponses: (
    activeServerRequests: $ReadOnlyArray<ServerRequest>,
  ) => $ReadOnlyArray<ClientClientResponse>,
  currentCalendarQuery: () => CalendarQuery,
  // Redux state
  connection: ConnectionInfo,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class RequestResponseHandler extends React.PureComponent<Props> {

  static propTypes = {
    inflightRequests: PropTypes.object,
    sendMessage: PropTypes.func.isRequired,
    addListener: PropTypes.func.isRequired,
    removeListener: PropTypes.func.isRequired,
    getClientResponses: PropTypes.func.isRequired,
    currentCalendarQuery: PropTypes.func.isRequired,
    connection: connectionInfoPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.props.addListener(this.onMessage);
  }

  componentWillUnmount() {
    this.props.removeListener(this.onMessage);
  }

  render() {
    return null;
  }

  onMessage = (message: ServerSocketMessage) => {
    if (message.type !== serverSocketMessageTypes.REQUESTS) {
      return;
    }
    const { serverRequests } = message.payload;
    if (serverRequests.length === 0) {
      return;
    }
    const calendarQuery = this.props.currentCalendarQuery();
    this.props.dispatchActionPayload(
      processServerRequestsActionType,
      { serverRequests, calendarQuery },
    );
    if (this.props.inflightRequests) {
      const clientResponses = this.props.getClientResponses(serverRequests);
      this.sendAndHandleClientResponsesToServerRequests(clientResponses);
    }
  }

  sendClientResponses(
    clientResponses: $ReadOnlyArray<ClientClientResponse>,
  ): Promise<RequestsServerSocketMessage> {
    const { inflightRequests } = this.props;
    invariant(
      inflightRequests,
      "inflightRequests falsey inside sendClientResponses",
    );
    const messageID = this.props.sendMessage({
      type: clientSocketMessageTypes.RESPONSES,
      payload: { clientResponses },
    });
    return inflightRequests.fetchResponse(
      messageID,
      serverSocketMessageTypes.REQUESTS,
    );
  }

  sendAndHandleClientResponsesToServerRequests(
    clientResponses: $ReadOnlyArray<ClientClientResponse>,
  ) {
    if (clientResponses.length === 0) {
      return;
    }
    const promise = this.sendClientResponses(clientResponses);
    this.handleClientResponsesToServerRequests(promise, clientResponses);
  }

  async handleClientResponsesToServerRequests(
    promise: Promise<RequestsServerSocketMessage>,
    clientResponses: $ReadOnlyArray<ClientClientResponse>,
    retriesLeft: number = 1,
  ): Promise<void> {
    try {
      await promise;
    } catch (e) {
      console.log(e);
      if (
        !(e instanceof SocketTimeout) &&
        (!(e instanceof ServerError) || e.message === "unknown_error") &&
        retriesLeft > 0 &&
        this.props.connection.status === "connected" &&
        this.props.inflightRequests
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

}

export default connect(
  (state: AppState) => ({
    connection: state.connection,
  }),
  null,
  true,
)(RequestResponseHandler);
