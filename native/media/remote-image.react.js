// @flow

import { Image } from 'expo-image';
import * as React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

import { type ConnectionStatus } from 'lib/types/socket-types.js';

import { useSelector } from '../redux/redux-utils.js';
import type { ImageStyle } from '../types/styles.js';

type BaseProps = {
  +uri: string,
  +onLoad: (uri: string) => void,
  +spinnerColor: string,
  +style: ImageStyle,
  +invisibleLoad: boolean,
};
type Props = {
  ...BaseProps,
  +connectionStatus: ConnectionStatus,
};
type State = {
  +attempt: number,
  +loaded: boolean,
};
class RemoteImage extends React.PureComponent<Props, State> {
  state: State = {
    attempt: 0,
    loaded: false,
  };

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      !this.state.loaded &&
      this.props.connectionStatus === 'connected' &&
      prevProps.connectionStatus !== 'connected'
    ) {
      this.setState(otherPrevState => ({
        attempt: otherPrevState.attempt + 1,
      }));
    }
    if (this.state.loaded && !prevState.loaded) {
      this.props.onLoad && this.props.onLoad(this.props.uri);
    }
  }

  render() {
    const source = { uri: this.props.uri };
    if (this.state.loaded) {
      return (
        <Image
          source={source}
          onLoad={this.onLoad}
          style={this.props.style}
          key={this.state.attempt}
        />
      );
    }

    if (this.props.invisibleLoad) {
      return (
        <Image
          source={source}
          onLoad={this.onLoad}
          style={[this.props.style, styles.invisible]}
          key={this.state.attempt}
        />
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.spinnerContainer}>
          <ActivityIndicator color={this.props.spinnerColor} size="large" />
        </View>
        <Image
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
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  invisible: {
    opacity: 0,
  },
  spinnerContainer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

const ConnectedRemoteImage: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedRemoteImage(props: BaseProps) {
    const connectionStatus = useSelector(state => state.connection.status);

    return <RemoteImage {...props} connectionStatus={connectionStatus} />;
  });

export default ConnectedRemoteImage;
