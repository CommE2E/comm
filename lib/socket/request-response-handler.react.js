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
  clearDeliveredClientResponsesActionType,
  processServerRequestsActionType,
  type ClientResponse,
  type ServerRequest,
  clientResponsePropType,
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
import {
  queuedClientResponsesSelector,
  getClientResponsesSelector,
} from '../selectors/socket-selectors';

type Props = {|
  inflightRequests: ?InflightRequests,
  sendMessage: (message: ClientSocketMessageWithoutID) => number,
  addListener: (listener: SocketListener) => void,
  removeListener: (listener: SocketListener) => void,
  getClientResponses: (
    activeServerRequests: $ReadOnlyArray<ServerRequest>,
  ) => $ReadOnlyArray<ClientResponse>,
  currentCalendarQuery: () => CalendarQuery,
  // Redux state
  connection: ConnectionInfo,
  queuedClientResponses: $ReadOnlyArray<ClientResponse>,
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
    queuedClientResponses: PropTypes.arrayOf(clientResponsePropType).isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.props.addListener(this.onMessage);
  }

  componentWillUnmount() {
    this.props.removeListener(this.onMessage);
  }

  componentDidUpdate(prevProps: Props) {
    const { inflightRequests, connection } = this.props;
    if (!inflightRequests || connection.status !== "connected") {
      return;
    }

    const { queuedClientResponses } = this.props;
    const prevClientResponses = prevProps.queuedClientResponses;

    if (prevProps.connection.status !== "connected") {
      this.sendAndHandleQueuedClientResponses(queuedClientResponses);
    } else if (queuedClientResponses !== prevClientResponses) {
      const prevResponses = new Set(prevClientResponses);
      const newResponses = queuedClientResponses.filter(
        response => !prevResponses.has(response),
      );
      this.sendAndHandleQueuedClientResponses(newResponses);
    }
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

  async handleQueuedClientResponses(
    promise: Promise<RequestsServerSocketMessage>,
    clientResponses: $ReadOnlyArray<ClientResponse>,
    retriesLeft: number = 1,
  ): Promise<void> {
    try {
      await promise;
      this.props.dispatchActionPayload(
        clearDeliveredClientResponsesActionType,
        { clientResponses },
      );
    } catch (e) {
      console.log(e);
      if (
        e instanceof SocketTimeout ||
        this.props.connection.status !== "connected" ||
        !this.props.inflightRequests
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
    queuedClientResponses: queuedClientResponsesSelector(state),
  }),
  null,
  true,
)(RequestResponseHandler);
