// @flow

import {
  type ConnectionStatus,
  connectionStatusPropType,
} from 'lib/types/socket-types';
import type { AppState } from '../redux/redux-setup';
import type { ImageStyle } from '../types/styles';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';

import { connect } from 'lib/utils/redux-utils';

type Props = {|
  uri: string,
  onLoad: (uri: string) => void,
  spinnerColor: "black" | "white",
  style: ImageStyle,
  invisibleLoad: bool,
  // Redux state
  connectionStatus: ConnectionStatus,
|};
type State = {|
  attempt: number,
  loaded: bool,
|};
class RemoteImage extends React.PureComponent<Props, State> {

  static propTypes = {
    uri: PropTypes.string.isRequired,
    onLoad: PropTypes.func.isRequired,
    spinnerColor: PropTypes.oneOf([ "black", "white" ]).isRequired,
    invisibleLoad: PropTypes.bool.isRequired,
    connectionStatus: connectionStatusPropType.isRequired,
  };
  state = {
    attempt: 0,
    loaded: false,
  };

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      !this.state.loaded &&
      this.props.connectionStatus === "connected" &&
      prevProps.connectionStatus !== "connected"
    ) {
      this.setState(prevState => ({ attempt: prevState.attempt + 1 }));
    }
    if (this.state.loaded && !prevState.loaded) {
      this.props.onLoad && this.props.onLoad(this.props.uri);
    }
  }

  render() {
    let spinner = null;
    if (!this.state.loaded && !this.props.invisibleLoad) {
      spinner = (
        <View style={styles.spinnerContainer}>
          <ActivityIndicator
            color={this.props.spinnerColor}
            size="large"
          />
        </View>
      );
    }

    const source = { uri: this.props.uri };
    const containerStyle = !this.state.loaded && this.props.invisibleLoad
      ? styles.invisibleContainer
      : styles.container;
    return (
      <View style={containerStyle}>
        {spinner}
        <FastImage
          source={source}
          onLoad={this.onLoad}
          style={this.props.style}
          key={this.state.attempt}
        />
      </View>
    );
  }

  onLoad = () => {
    this.setState({ loaded: true });
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  invisibleContainer: {
    flex: 1,
    opacity: 0,
  },
  spinnerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default connect(
  (state: AppState) => ({
    connectionStatus: state.connection.status,
  }),
)(RemoteImage);
