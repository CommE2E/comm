// @flow

import invariant from 'invariant';
import * as React from 'react';

import { InflightRequests } from './inflight-requests.js';
import { useCallKeyserverEndpointContext } from '../keyserver-conn/call-keyserver-endpoint-provider.react.js';
import { connectionSelector } from '../selectors/keyserver-selectors.js';
import type { APIRequest, SocketAPIHandler } from '../types/endpoints.js';
import {
  clientSocketMessageTypes,
  serverSocketMessageTypes,
  type ClientSocketMessageWithoutID,
  type ConnectionInfo,
  type APIResponseServerSocketMessage,
} from '../types/socket-types.js';
import { SocketOffline } from '../utils/errors.js';
import { useSelector } from '../utils/redux-utils.js';

type BaseProps = {
  +inflightRequests: ?InflightRequests,
  +sendMessage: (message: ClientSocketMessageWithoutID) => number,
  +keyserverID: string,
};
type Props = {
  ...BaseProps,
  +connection: ConnectionInfo,
  +registerActiveSocket: (
    keyserverID: string,
    socketAPIHandler: ?SocketAPIHandler,
  ) => mixed,
};
class APIRequestHandler extends React.PureComponent<Props> {
  static isConnected(props: Props, request?: APIRequest): boolean {
    const { inflightRequests, connection } = props;
    if (!inflightRequests) {
      return false;
    }
    // This is a hack. We actually have a race condition between
    // ActivityHandler and Socket. Both of them respond to a backgrounding, but
    // we want ActivityHandler to go first. Once it sends its message, Socket
    // will wait for the response before shutting down. But if Socket starts
    // shutting down first, we'll have a problem. Note that this approach only
    // stops the race in fetchResponse below, and not in action-utils (which
    // happens earlier via the registerActiveSocket call below), but empirically
    // that hasn't been an issue.
    // The reason I didn't rewrite this to happen in a single component is
    // because I want to maintain separation of concerns. Upcoming React Hooks
    // will be a great way to rewrite them to be related but still separated.
    return (
      connection.status === 'connected' ||
      request?.endpoint === 'update_activity'
    );
  }

  get registeredResponseFetcher(): ?SocketAPIHandler {
    return APIRequestHandler.isConnected(this.props)
      ? this.fetchResponse
      : null;
  }

  componentDidMount() {
    this.props.registerActiveSocket(
      this.props.keyserverID,
      this.registeredResponseFetcher,
    );
  }

  componentWillUnmount() {
    this.props.registerActiveSocket(this.props.keyserverID, null);
  }

  componentDidUpdate(prevProps: Props) {
    const isConnected = APIRequestHandler.isConnected(this.props);
    const wasConnected = APIRequestHandler.isConnected(prevProps);
    if (isConnected !== wasConnected) {
      this.props.registerActiveSocket(
        this.props.keyserverID,
        this.registeredResponseFetcher,
      );
    }
  }

  render(): React.Node {
    return null;
  }

  fetchResponse = async (request: APIRequest): Promise<mixed> => {
    if (!APIRequestHandler.isConnected(this.props, request)) {
      throw new SocketOffline('socket_offline');
    }
    const { inflightRequests } = this.props;
    invariant(inflightRequests, 'inflightRequests falsey inside fetchResponse');
    const messageID = this.props.sendMessage({
      type: clientSocketMessageTypes.API_REQUEST,
      payload: request,
    });
    const response =
      await inflightRequests.fetchResponse<APIResponseServerSocketMessage>(
        messageID,
        serverSocketMessageTypes.API_RESPONSE,
      );
    return response.payload;
  };
}

const ConnectedAPIRequestHandler: React.ComponentType<BaseProps> = React.memo(
  function ConnectedAPIRequestHandler(props) {
    const connection = useSelector(connectionSelector(props.keyserverID));
    invariant(connection, 'keyserver missing from keyserverStore');
    const { registerActiveSocket } = useCallKeyserverEndpointContext();
    return (
      <APIRequestHandler
        {...props}
        connection={connection}
        registerActiveSocket={registerActiveSocket}
      />
    );
  },
);

export default ConnectedAPIRequestHandler;
