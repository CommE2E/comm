// @flow

import PropTypes from 'prop-types';
import * as React from 'react';

import {
  type ConnectionStatus,
  connectionStatusPropType,
  updateDisconnectedBarActionType,
} from 'lib/types/socket-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import { connect } from 'lib/utils/redux-utils';

import type { AppState } from '../redux/redux-setup';
import {
  type ConnectivityInfo,
  connectivityInfoPropType,
} from '../types/connectivity';

type Props = {|
  // Redux state
  showDisconnectedBar: boolean,
  connectionStatus: ConnectionStatus,
  someRequestIsLate: boolean,
  connectivity: ConnectivityInfo,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class DisconnectedBarVisibilityHandler extends React.PureComponent<Props> {
  static propTypes = {
    showDisconnectedBar: PropTypes.bool.isRequired,
    connectionStatus: connectionStatusPropType.isRequired,
    someRequestIsLate: PropTypes.bool.isRequired,
    connectivity: connectivityInfoPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  networkActive = true;

  get disconnected() {
    return this.props.showDisconnectedBar;
  }

  setDisconnected(disconnected: boolean) {
    if (this.disconnected === disconnected) {
      return;
    }
    this.props.dispatchActionPayload(updateDisconnectedBarActionType, {
      visible: disconnected,
    });
  }

  componentDidMount() {
    this.handleConnectionChange();
  }

  handleConnectionChange() {
    this.networkActive = this.props.connectivity.connected;
    if (!this.networkActive) {
      this.setDisconnected(true);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { connected } = this.props.connectivity;
    if (connected !== prevProps.connectivity.connected) {
      this.handleConnectionChange();
    }

    const { connectionStatus: status, someRequestIsLate } = this.props;
    if (status === 'connected' && prevProps.connectionStatus !== 'connected') {
      // Sometimes NetInfo misses the network coming back online for some
      // reason. But if the socket reconnects, the network must be up
      this.networkActive = true;
      this.setDisconnected(false);
    } else if (!this.networkActive || someRequestIsLate) {
      this.setDisconnected(true);
    } else if (status === 'reconnecting' || status === 'forcedDisconnecting') {
      this.setDisconnected(true);
    } else if (status === 'connected') {
      this.setDisconnected(false);
    }
  }

  render() {
    return null;
  }
}

export default connect(
  (state: AppState) => ({
    showDisconnectedBar: state.connection.showDisconnectedBar,
    connectionStatus: state.connection.status,
    someRequestIsLate: state.connection.lateResponses.length !== 0,
    connectivity: state.connectivity,
  }),
  null,
  true,
)(DisconnectedBarVisibilityHandler);
