// @flow

import { type Media, mediaPropType } from 'lib/types/media-types';
import type { ImageStyle } from '../types/styles';

import * as React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';

type Props = {|
  media: Media,
  onLoad: (mediaID: string) => void,
  style?: ?ImageStyle,
|};
class Multimedia extends React.PureComponent<Props> {

  static propTypes = {
    media: mediaPropType.isRequired,
    onLoad: PropTypes.func.isRequired,
  };

  render() {
    const { media, style } = this.props;
    const { uri } = media;
    const source = { uri };
    return (
      <FastImage
        source={source}
        onLoad={this.onLoad}
        style={[styles.image, style]}
      />
    );
  }

  onLoad = () => {
    this.props.onLoad(this.props.media.id);
  }

}

const styles = StyleSheet.create({
  image: {
    flex: 1,
  },
});

export default Multimedia;
