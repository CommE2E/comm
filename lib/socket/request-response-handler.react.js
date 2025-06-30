// @flow

import invariant from 'invariant';
import * as React from 'react';

import { InflightRequests } from './inflight-requests.js';
import { connectionSelector } from '../selectors/keyserver-selectors.js';
import type { CalendarQuery } from '../types/entry-types.js';
import type { Dispatch } from '../types/redux-types.js';
import {
  processServerRequestsActionType,
  type ClientClientResponse,
  type ClientServerRequest,
} from '../types/request-types.js';
import {
  type ClientRequestsServerSocketMessage,
  type ClientServerSocketMessage,
  clientSocketMessageTypes,
  serverSocketMessageTypes,
  type ClientSocketMessageWithoutID,
  type SocketListener,
  type ConnectionInfo,
} from '../types/socket-types.js';
import { ServerError, SocketTimeout } from '../utils/errors.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';

type BaseProps = {
  +inflightRequests: ?InflightRequests,
  +sendMessage: (message: ClientSocketMessageWithoutID) => number,
  +addListener: (listener: SocketListener) => void,
  +removeListener: (listener: SocketListener) => void,
  +getClientResponses: (
    activeServerRequests: $ReadOnlyArray<ClientServerRequest>,
  ) => Promise<$ReadOnlyArray<ClientClientResponse>>,
  +currentCalendarQuery: () => CalendarQuery,
  +keyserverID: string,
};
type Props = {
  ...BaseProps,
  +connection: ConnectionInfo,
  +dispatch: Dispatch,
};
class RequestResponseHandler extends React.PureComponent<Props> {
  componentDidMount() {
    this.props.addListener(this.onMessage);
  }

  componentWillUnmount() {
    this.props.removeListener(this.onMessage);
  }

  render(): React.Node {
    return null;
  }

  onMessage = (message: ClientServerSocketMessage) => {
    if (message.type !== serverSocketMessageTypes.REQUESTS) {
      return;
    }
    const { serverRequests } = message.payload;
    if (serverRequests.length === 0) {
      return;
    }
    const calendarQuery = this.props.currentCalendarQuery();
    this.props.dispatch({
      type: processServerRequestsActionType,
      payload: {
        serverRequests,
        calendarQuery,
        keyserverID: this.props.keyserverID,
      },
    });
    if (this.props.inflightRequests) {
      const clientResponsesPromise =
        this.props.getClientResponses(serverRequests);
      void this.sendAndHandleClientResponsesToServerRequests(
        clientResponsesPromise,
      );
    }
  };

  sendClientResponses(
    clientResponses: $ReadOnlyArray<ClientClientResponse>,
  ): Promise<ClientRequestsServerSocketMessage> {
    const { inflightRequests } = this.props;
    invariant(
      inflightRequests,
      'inflightRequests falsey inside sendClientResponses',
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

  async sendAndHandleClientResponsesToServerRequests(
    clientResponsesPromise: Promise<$ReadOnlyArray<ClientClientResponse>>,
  ) {
    const clientResponses = await clientResponsesPromise;
    if (clientResponses.length === 0) {
      return;
    }
    const promise = this.sendClientResponses(clientResponses);
    void this.handleClientResponsesToServerRequests(promise, clientResponses);
  }

  async handleClientResponsesToServerRequests(
    promise: Promise<ClientRequestsServerSocketMessage>,
    clientResponses: $ReadOnlyArray<ClientClientResponse>,
    retriesLeft: number = 1,
  ): Promise<void> {
    try {
      await promise;
    } catch (e) {
      console.log(e);
      if (
        !(e instanceof SocketTimeout) &&
        (!(e instanceof ServerError) || e.message === 'unknown_error') &&
        retriesLeft > 0 &&
        this.props.connection.status === 'connected' &&
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

const ConnectedRequestResponseHandler: React.ComponentType<BaseProps> =
  React.memo<BaseProps, void>(function ConnectedRequestResponseHandler(props) {
    const connection = useSelector(connectionSelector(props.keyserverID));
    invariant(connection, 'keyserver missing from keyserverStore');

    const dispatch = useDispatch();

    return (
      <RequestResponseHandler
        {...props}
        connection={connection}
        dispatch={dispatch}
      />
    );
  });
export default ConnectedRequestResponseHandler;
