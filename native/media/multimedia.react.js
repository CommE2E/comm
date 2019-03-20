// @flow

import { type Media, mediaPropType } from 'lib/types/media-types';
import type { ImageStyle } from '../types/styles';
import {
  type ConnectionStatus,
  connectionStatusPropType,
} from 'lib/types/socket-types';
import type { AppState } from '../redux-setup';

import * as React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';

import { connect } from 'lib/utils/redux-utils';

type Props = {|
  media: Media,
  style?: ?ImageStyle,
  // Redux state
  connectionStatus: ConnectionStatus,
|};
type State = {|
  attempt: number,
  loaded: bool,
|};
class Multimedia extends React.PureComponent<Props, State> {

  static propTypes = {
    media: mediaPropType.isRequired,
    connectionStatus: connectionStatusPropType.isRequired,
  };
  state = {
    attempt: 0,
    loaded: false,
  };

  componentDidUpdate(prevProps: Props) {
    if (
      !this.state.loaded &&
      this.props.connectionStatus === "connected" &&
      prevProps.connectionStatus !== "connected"
    ) {
      this.setState(prevState => ({ attempt: prevState.attempt + 1 }));
    }
  }

  render() {
    const { media, style } = this.props;
    const { uri } = media;
    const source = { uri };
    const image = (
      <FastImage
        source={source}
        onLoad={this.onLoad}
        style={[styles.image, style]}
        key={this.state.attempt}
      />
    );

    let loadingOverlay;
    if (!this.state.loaded) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            color="black"
            size="large"
            style={styles.loadingOverlay}
          />
          {image}
        </View>
      );
    }

    return image;
  }

  onLoad = () => {
    this.setState({ loaded: true });
  }

}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
  },
  image: {
    flex: 1,
  },
});

export default connect(
  (state: AppState) => ({
    connectionStatus: state.connection.status,
  }),
)(Multimedia);
