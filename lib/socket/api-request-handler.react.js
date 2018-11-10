// @flow

import {
  clientSocketMessageTypes,
  serverSocketMessageTypes,
  type ClientSocketMessageWithoutID,
  type ConnectionInfo,
  connectionInfoPropType,
} from '../types/socket-types';
import type { APIRequest } from '../types/endpoints';
import type { BaseAppState } from '../types/redux-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { connect } from '../utils/redux-utils';
import { registerActiveSocket } from '../utils/action-utils';
import { InflightRequests, SocketOffline } from './inflight-requests';

type Props = {|
  inflightRequests: ?InflightRequests,
  sendMessage: (message: ClientSocketMessageWithoutID) => number,
  // Redux state
  connection: ConnectionInfo,
|};
class APIRequestHandler extends React.PureComponent<Props> {

  static propTypes = {
    inflightRequests: PropTypes.object,
    sendMessage: PropTypes.func.isRequired,
    connection: connectionInfoPropType.isRequired,
  };

  static isConnected(props: Props) {
    const { inflightRequests, connection } = props;
    return inflightRequests && connection.status === "connected";
  }

  get registeredResponseFetcher() {
    return APIRequestHandler.isConnected(this.props)
      ? this.fetchResponse
      : null;
  }

  componentDidMount() {
    registerActiveSocket(this.registeredResponseFetcher);
  }

  componentWillUnmount() {
    registerActiveSocket(null);
  }

  componentDidUpdate(prevProps: Props) {
    const isConnected = APIRequestHandler.isConnected(this.props);
    const wasConnected = APIRequestHandler.isConnected(prevProps);
    if (isConnected !== wasConnected) {
      registerActiveSocket(this.registeredResponseFetcher);
    }
  }

  render() {
    return null;
  }

  fetchResponse = async (request: APIRequest): Promise<Object> => {
    if (!APIRequestHandler.isConnected(this.props)) {
      throw new SocketOffline("socket_offline");
    }
    const { inflightRequests } = this.props;
    invariant(
      inflightRequests,
      "inflightRequests falsey inside fetchResponse",
    );
    const messageID = this.props.sendMessage({
      type: clientSocketMessageTypes.API_REQUEST,
      payload: request,
    });
    const response = await inflightRequests.fetchResponse(
      messageID,
      serverSocketMessageTypes.API_RESPONSE,
    );
    return response.payload;
  }

}

export default connect((state: BaseAppState<*>) => ({
  connection: state.connection,
}))(APIRequestHandler);
