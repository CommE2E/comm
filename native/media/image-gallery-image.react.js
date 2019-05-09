// @flow

import type { Dimensions } from 'lib/types/media-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Image, TouchableOpacity, StyleSheet } from 'react-native';

export type GalleryImageInfo = {|
  ...Dimensions,
  uri: string,
|};

type Props = {|
  imageInfo: GalleryImageInfo,
  containerHeight: number,
  queueModeActive: bool,
  isQueued: bool,
  setImageQueued: (image: GalleryImageInfo, isQueued: bool) => void,
  sendImage: (image: GalleryImageInfo) => void,
  isFocused: bool,
  setFocus: (image: GalleryImageInfo) => void,
  screenWidth: number,
|};
class ImageGalleryImage extends React.PureComponent<Props> {

  static propTypes = {
    imageInfo: PropTypes.shape({
      height: PropTypes.number.isRequired,
      width: PropTypes.number.isRequired,
      uri: PropTypes.string.isRequired,
    }).isRequired,
    containerHeight: PropTypes.number.isRequired,
    queueModeActive: PropTypes.bool.isRequired,
    isQueued: PropTypes.bool.isRequired,
    setImageQueued: PropTypes.func.isRequired,
    sendImage: PropTypes.func.isRequired,
    isFocused: PropTypes.bool.isRequired,
    setFocus: PropTypes.func.isRequired,
    screenWidth: PropTypes.number.isRequired,
  };
  button: ?TouchableOpacity;

  static isActive(props: Props) {
    return props.isFocused || props.isQueued;
  }

  componentDidUpdate(prevProps: Props) {
    const { button } = this;
    if (!button) {
      return;
    }
    const isActive = ImageGalleryImage.isActive(this.props);
    const wasActive = ImageGalleryImage.isActive(prevProps);
    if (isActive && !wasActive) {
      button.setOpacityTo(0.2, 0);
    } else if (!isActive && wasActive) {
      button.setOpacityTo(1, 0);
    }
  }

  render() {
    const { imageInfo, containerHeight } = this.props;
    const { uri, width, height } = imageInfo;
    const source = { uri };
    const imageStyle = {
      height: containerHeight,
      width: Math.min(
        width / height * containerHeight,
        this.props.screenWidth,
      ),
    };
    const buttonStyle = {
      opacity: ImageGalleryImage.isActive(this.props) ? 0.2 : 1,
    };
    return (
      <TouchableOpacity
        onPress={this.onPress}
        style={[ styles.button, buttonStyle ]}
        ref={this.buttonRef}
      >
        <Image source={source} style={imageStyle} />
      </TouchableOpacity>
    );
  }

  buttonRef = (button: ?TouchableOpacity) => {
    this.button = button;
  }

  onPress = () => {
    this.props.setFocus(this.props.imageInfo);
  }

}

const styles = StyleSheet.create({
  button: {
    flex: 1,
  },
});

export default ImageGalleryImage;
