// @flow

import PropTypes from 'prop-types';
import * as React from 'react';

import type { AppState } from '../types/redux-types';
import {
  type ClientSocketMessageWithoutID,
  type SocketListener,
  type ConnectionInfo,
  connectionInfoPropType,
  type ServerSocketMessage,
  serverSocketMessageTypes,
  clientSocketMessageTypes,
} from '../types/socket-types';
import { processUpdatesActionType } from '../types/update-types';
import type { DispatchActionPayload } from '../utils/action-utils';
import { connect } from '../utils/redux-utils';

type Props = {|
  sendMessage: (message: ClientSocketMessageWithoutID) => number,
  addListener: (listener: SocketListener) => void,
  removeListener: (listener: SocketListener) => void,
  // Redux state
  connection: ConnectionInfo,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class UpdateHandler extends React.PureComponent<Props> {
  static propTypes = {
    sendMessage: PropTypes.func.isRequired,
    addListener: PropTypes.func.isRequired,
    removeListener: PropTypes.func.isRequired,
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
    if (message.type !== serverSocketMessageTypes.UPDATES) {
      return;
    }
    this.props.dispatchActionPayload(processUpdatesActionType, message.payload);
    if (this.props.connection.status !== 'connected') {
      return;
    }
    this.props.sendMessage({
      type: clientSocketMessageTypes.ACK_UPDATES,
      payload: {
        currentAsOf: message.payload.updatesResult.currentAsOf,
      },
    });
  };
}

export default connect(
  (state: AppState) => ({
    connection: state.connection,
  }),
  null,
  true,
)(UpdateHandler);
