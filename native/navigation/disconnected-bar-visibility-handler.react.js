// @flow

import {
  type ConnectionStatus,
  connectionStatusPropType,
  updateDisconnectedBarActionType,
} from 'lib/types/socket-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';

import * as React from 'react';
import PropTypes from 'prop-types';
import { NetInfo } from 'react-native';

import { connect } from 'lib/utils/redux-utils';

type Props = {|
  // Redux state
  showDisconnectedBar: bool,
  connectionStatus: ConnectionStatus,
  someRequestIsLate: bool,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class DisconnectedBarVisibilityHandler extends React.PureComponent<Props> {

  static propTypes = {
    showDisconnectedBar: PropTypes.bool.isRequired,
    connectionStatus: connectionStatusPropType.isRequired,
    someRequestIsLate: PropTypes.bool.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  networkActive = true;

  get disconnected() {
    return this.props.showDisconnectedBar;
  }

  setDisconnected(disconnected: bool) {
    if (this.disconnected === disconnected) {
      return;
    }
    this.props.dispatchActionPayload(
      updateDisconnectedBarActionType,
      { visible: disconnected },
    );
  }

  componentDidMount() {
    NetInfo.isConnected.addEventListener(
      'connectionChange',
      this.handleConnectionChange,
    );
    NetInfo.isConnected.fetch().then(this.handleConnectionChange);
  }

  componentWillUnmount() {
    NetInfo.isConnected.removeEventListener(
      'connectionChange',
      this.handleConnectionChange,
    );
  }

  handleConnectionChange = isConnected => {
    this.networkActive = isConnected;
    if (!this.networkActive) {
      this.setDisconnected(true);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { connectionStatus: status, someRequestIsLate } = this.props;
    if (status === "connected" && prevProps.connectionStatus !== "connected") {
      // Sometimes NetInfo misses the network coming back online for some
      // reason. But if the socket reconnects, the network must be up
      this.networkActive = true;
      this.setDisconnected(false);
    } else if (!this.networkActive || someRequestIsLate) {
      this.setDisconnected(true);
    } else if (status === "reconnecting" || status === "forcedDisconnecting") {
      this.setDisconnected(true);
    } else if (status === "connected") {
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
  }),
  null,
  true,
)(DisconnectedBarVisibilityHandler);
