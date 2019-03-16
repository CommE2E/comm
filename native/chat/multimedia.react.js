// @flow

import { type Media, mediaPropType } from 'lib/types/media-types';
import type { ImageStyle } from '../types/styles';
import type { LoadingStatus } from 'lib/types/loading-types';

import * as React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';

type Props = {|
  media: Media,
  style?: ?ImageStyle,
|};
type State = {|
  loadingStatus: LoadingStatus,
|};
class Multimedia extends React.PureComponent<Props, State> {

  static propTypes = {
    media: mediaPropType.isRequired,
  };
  state = {
    loadingStatus: "loading",
  };

  render() {
    const { media, style } = this.props;
    const { uri } = media;
    const source = { uri };
    const image = (
      <FastImage
        source={source}
        onLoad={this.onLoad}
        style={[styles.image, style]}
      />
    );

    let loadingOverlay;
    if (this.state.loadingStatus !== "inactive") {
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
    this.setState({ loadingStatus: "inactive" });
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

export default Multimedia;
