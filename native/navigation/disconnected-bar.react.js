// @flow

import type { AppState } from '../redux-setup';
import {
  type ConnectionStatus,
  connectionStatusPropType,
} from 'lib/types/socket-types';

import * as React from 'react';
import { View, Text, StyleSheet, LayoutAnimation, NetInfo } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

type Props = {|
  connectionStatus: ConnectionStatus,
  someRequestIsLate: bool,
|};
type State = {|
  disconnected: bool,
|};
class DisconnectedBar extends React.PureComponent<Props, State> {

  static propTypes = {
    connectionStatus: connectionStatusPropType.isRequired,
    someRequestIsLate: PropTypes.bool.isRequired,
  };
  state = {
    disconnected: false,
  };
  networkActive = true;

  componentDidMount() {
    NetInfo.addEventListener(
      'connectionChange',
      this.handleConnectionChange,
    );
    NetInfo.getConnectionInfo().then(this.handleConnectionChange);
  }

  componentWillUnmount() {
    NetInfo.removeEventListener(
      'connectionChange',
      this.handleConnectionChange,
    );
  }

  handleConnectionChange = connectionInfo => {
    this.networkActive = connectionInfo.type !== "none";
    if (!this.networkActive && !this.state.disconnected) {
      this.setState({ disconnected: true });
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { connectionStatus, someRequestIsLate } = this.props;

    let newDisconnected;
    if (!this.networkActive || someRequestIsLate) {
      newDisconnected = true;
    } else if (connectionStatus !== "disconnected") {
      newDisconnected = connectionStatus === "reconnecting";
    }

    const { disconnected } = this.state;
    if (newDisconnected !== undefined && newDisconnected !== disconnected) {
      this.setState({ disconnected: newDisconnected });
    }

    if (this.state.disconnected !== prevState.disconnected) {
      LayoutAnimation.easeInEaseOut();
    }
  }

  render() {
    const { connectionStatus } = this.props;
    const { disconnected } = this.state;

    const disconnectedBarStyles = [ styles.disconnectedBar ];
    let text;
    if (disconnected) {
      text = <Text style={styles.disconnectedText}>DISCONNECTED</Text>;
    } else {
      disconnectedBarStyles.push(styles.hiddenDisconnectedBar);
    }

    return <View style={disconnectedBarStyles}>{text}</View>;
  }

}

const styles = StyleSheet.create({
  disconnectedBar: {
    backgroundColor: '#CC0000',
    padding: 5,
  },
  hiddenDisconnectedBar: {
    height: 0,
    padding: 0,
  },
  disconnectedText: {
    fontSize: 14,
    textAlign: 'center',
    color: 'white',
  },
});

export default connect((state: AppState) => ({
  connectionStatus: state.connection.status,
  someRequestIsLate: state.connection.lateResponses.length !== 0,
}))(DisconnectedBar);
