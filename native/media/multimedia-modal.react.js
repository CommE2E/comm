// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
  NavigationScene,
  NavigationTransitionProps,
} from 'react-navigation';
import {
  type Media,
  mediaPropType,
  type Dimensions,
  dimensionsPropType,
} from 'lib/types/media-types';
import type { AppState } from '../redux-setup';

import * as React from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import {
  dimensionsSelector,
  contentVerticalOffset,
} from '../selectors/dimension-selectors';
import Multimedia from './multimedia.react';
import ConnectedStatusBar from '../connected-status-bar.react';

type LayoutCoordinates = $ReadOnly<{|
  x: number,
  y: number,
  width: number,
  height: number,
|}>;
type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {|
    media: Media,
    initialCoordinates: LayoutCoordinates,
  |},
|}>;

type Props = {|
  navigation: NavProp,
  scene: NavigationScene,
  transitionProps: NavigationTransitionProps,
  // Redux state
  screenDimensions: Dimensions,
|};
class MultimediaModal extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          media: mediaPropType.isRequired,
          initialCoordinates: PropTypes.shape({
            x: PropTypes.number.isRequired,
            y: PropTypes.number.isRequired,
            width: PropTypes.number.isRequired,
            height: PropTypes.number.isRequired,
          }).isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    transitionProps: PropTypes.object.isRequired,
    scene: PropTypes.object.isRequired,
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

  get imageContainerStyle() {
    const { height, width } = this.imageDimensions;
    const { height: screenHeight, width: screenWidth } = this.screenDimensions;
    const top = (screenHeight - height) / 2 + contentVerticalOffset;
    const left = (screenWidth - width) / 2;

    const { position } = this.props.transitionProps;
    const { index } = this.props.scene;
    const opacity = position.interpolate({
      inputRange: [ index - 1, index - 0.9 ],
      outputRange: ([ 0, 1 ]: number[]),
    });

    const { initialCoordinates } = this.props.navigation.state.params;
    const initialScaleX = initialCoordinates.width / width;
    const scaleX = position.interpolate({
      inputRange: [ index - 1, index ],
      outputRange: ([ initialScaleX, 1 ]: number[]),
    });
    const initialScaleY = initialCoordinates.height / height;
    const scaleY = position.interpolate({
      inputRange: [ index - 1, index ],
      outputRange: ([ initialScaleY, 1 ]: number[]),
    });

    const initialTranslateX =
      (initialCoordinates.x + initialCoordinates.width / 2)
      - (left + width / 2);
    const translateX = position.interpolate({
      inputRange: [ index - 1, index ],
      outputRange: ([ initialTranslateX, 0 ]: number[]),
    });
    const initialTranslateY =
      (initialCoordinates.y + initialCoordinates.height / 2)
      - (top + height / 2);
    const translateY = position.interpolate({
      inputRange: [ index - 1, index ],
      outputRange: ([ initialTranslateY, 0 ]: number[]),
    });

    return {
      position: 'absolute',
      height,
      width,
      top,
      left,
      opacity,
      transform: [
        { translateX },
        { translateY },
        { scaleX },
        { scaleY },
      ],
    };
  }

  get backdropStyle() {
    const { position } = this.props.transitionProps;
    const { index } = this.props.scene;
    return {
      opacity: position.interpolate({
        inputRange: [ index - 1, index ],
        outputRange: ([ 0, 1 ]: number[]),
      }),
    };
  }

  render() {
    const { media } = this.props.navigation.state.params;
    return (
      <View style={styles.container}>
        <ConnectedStatusBar barStyle="light-content" />
        <TouchableWithoutFeedback onPress={this.close}>
          <Animated.View style={[ styles.backdrop, this.backdropStyle ]} />
        </TouchableWithoutFeedback>
        <Animated.View style={this.imageContainerStyle}>
          <Multimedia media={media} spinnerColor="white" />
        </Animated.View>
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
    backgroundColor: "black",
  },
});

export default connect(
  (state: AppState) => ({
    screenDimensions: dimensionsSelector(state),
  }),
)(MultimediaModal);
