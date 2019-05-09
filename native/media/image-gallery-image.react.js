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
  onSelect: (imageInfo: GalleryImageInfo) => void,
|};
type State = {|
  selected: bool,
|};
class ImageGalleryImage extends React.PureComponent<Props, State> {

  static propTypes = {
    imageInfo: PropTypes.shape({
      height: PropTypes.number.isRequired,
      width: PropTypes.number.isRequired,
      uri: PropTypes.string.isRequired,
    }).isRequired,
    containerHeight: PropTypes.number.isRequired,
    onSelect: PropTypes.func.isRequired,
  };
  state = {
    selected: false,
  };
  button: ?TouchableOpacity;

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { button } = this;
    if (!button) {
      return;
    }
    if (this.state.selected && !prevState.selected) {
      button.setOpacityTo(0.2, 0);
    } else if (!this.state.selected && prevState.selected) {
      button.setOpacityTo(1, 0);
    }
  }

  render() {
    const { imageInfo, containerHeight } = this.props;
    const { uri, width, height } = imageInfo;
    const source = { uri };
    const imageStyle = {
      height: containerHeight,
      width: width / height * containerHeight,
    };
    const buttonStyle = {
      opacity: this.state.selected ? 0.2 : 1,
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
    //this.props.onSelect(this.props.imageInfo);
    this.setState({ selected: true });
  }

}

const styles = StyleSheet.create({
  button: {
    flex: 1,
  },
});

export default ImageGalleryImage;
