// @flow

import type { AppState } from '../redux-setup';
import {
  type ConnectionStatus,
  connectionStatusPropType,
} from 'lib/types/socket-types';

import * as React from 'react';
import { View, Text, StyleSheet, LayoutAnimation } from 'react-native';

import { connect } from 'lib/utils/redux-utils';

type Props = {|
  connectionStatus: ConnectionStatus,
|};
type State = {|
  disconnected: bool,
|};
class DisconnectedBar extends React.PureComponent<Props, State> {

  static propTypes = {
    connectionStatus: connectionStatusPropType.isRequired,
  };
  state = {
    disconnected: false,
  };

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { connectionStatus } = this.props;
    const { disconnected } = this.state;
    if (connectionStatus !== "disconnected") {
      if (connectionStatus === "reconnecting" && !disconnected) {
        this.setState({ disconnected: true });
      } else if (connectionStatus !== "reconnecting" && disconnected) {
        this.setState({ disconnected: false });
      }
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
}))(DisconnectedBar);
