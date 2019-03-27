// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import {
  type Media,
  mediaPropType,
  type Dimensions,
  dimensionsPropType,
} from 'lib/types/media-types';
import type { AppState } from '../redux-setup';

import * as React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import {
  dimensionsSelector,
  contentVerticalOffset,
} from '../selectors/dimension-selectors';
import Multimedia from './multimedia.react';
import ConnectedStatusBar from '../connected-status-bar.react';

type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {|
    media: Media,
  |},
|}>;

type Props = {|
  navigation: NavProp,
  // Redux state
  screenDimensions: Dimensions,
|};
class MultimediaModal extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          media: mediaPropType.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    screenDimensions: dimensionsPropType.isRequired,
  };

  get screenDimensions(): Dimensions {
    const { screenDimensions } = this.props;
    if (contentVerticalOffset === 0) {
      return screenDimensions;
    }
    const { height, width } = screenDimensions;
    return { height: height - contentVerticalOffset, width };
  }

  get imageDimensions(): Dimensions {
    const { height: screenHeight, width: screenWidth } = this.screenDimensions;
    const { dimensions } = this.props.navigation.state.params.media;
    if (dimensions.height < screenHeight && dimensions.width < screenWidth) {
      return dimensions;
    }
    const heightRatio = screenHeight / dimensions.height;
    const widthRatio = screenWidth / dimensions.width;
    if (heightRatio < widthRatio) {
      return {
        height: screenHeight,
        width: dimensions.width * heightRatio,
      };
    } else {
      return {
        width: screenWidth,
        height: dimensions.height * widthRatio,
      };
    }
  }

  get imageStyle() {
    const { height, width } = this.imageDimensions;
    const { height: screenHeight, width: screenWidth } = this.screenDimensions;
    const verticalSpace = (screenHeight - height) / 2;
    const horizontalSpace = (screenWidth - width) / 2;
    return {
      position: 'absolute',
      height,
      width,
      top: verticalSpace + contentVerticalOffset,
      left: horizontalSpace,
    };
  }

  render() {
    const { media } = this.props.navigation.state.params;
    return (
      <View style={styles.container}>
        <ConnectedStatusBar barStyle="light-content" />
        <TouchableWithoutFeedback onPress={this.close}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <Multimedia media={media} style={this.imageStyle} />
      </View>
    );
  }

  close = () => {
    this.props.navigation.goBack();
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.9,
    backgroundColor: "black",
  },
});

export default connect(
  (state: AppState) => ({
    screenDimensions: dimensionsSelector(state),
  }),
)(MultimediaModal);
