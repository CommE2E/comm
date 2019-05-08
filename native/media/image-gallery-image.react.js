// @flow

import type { Dimensions } from 'lib/types/media-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Image, TouchableOpacity } from 'react-native';

export type GalleryImageInfo = {|
  ...Dimensions,
  uri: string,
|};

type Props = {|
  imageInfo: GalleryImageInfo,
  containerHeight: number,
  onSelect: (imageInfo: GalleryImageInfo) => void,
|};
class ImageGalleryImage extends React.PureComponent<Props> {

  static propTypes = {
    imageInfo: PropTypes.shape({
      height: PropTypes.number.isRequired,
      width: PropTypes.number.isRequired,
      uri: PropTypes.string.isRequired,
    }).isRequired,
    containerHeight: PropTypes.number.isRequired,
    onSelect: PropTypes.func.isRequired,
  };

  render() {
    const { imageInfo, containerHeight } = this.props;
    const { uri, width, height } = imageInfo;
    const source = { uri };
    const style = {
      height: containerHeight,
      width: width / height * containerHeight,
    };
    return (
      <TouchableOpacity onPress={this.onPress}>
        <Image source={source} style={style} />
      </TouchableOpacity>
    );
  }

  onPress = () => {
    this.props.onSelect(this.props.imageInfo);
  }

}

export default ImageGalleryImage;
