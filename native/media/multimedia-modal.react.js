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
import { type VerticalBounds, verticalBoundsPropType } from './vertical-bounds';

import * as React from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/Feather';
import {
  PinchGestureHandler,
  PanGestureHandler,
  State as GestureState,
} from 'react-native-gesture-handler';

import { connect } from 'lib/utils/redux-utils';

import {
  contentVerticalOffset,
  contentBottomOffset,
  dimensionsSelector,
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
    verticalBounds: VerticalBounds,
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
          verticalBounds: verticalBoundsPropType.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    transitionProps: PropTypes.object.isRequired,
    scene: PropTypes.object.isRequired,
    screenDimensions: dimensionsPropType.isRequired,
  };

  pinchScale = new Animated.Value(1);
  pinchFocalX = new Animated.Value(0);
  pinchFocalY = new Animated.Value(0);
  pinchEvent = Animated.event(
    [{
      nativeEvent: {
        scale: this.pinchScale,
        focalX: this.pinchFocalX,
        focalY: this.pinchFocalY,
      },
    }],
    { useNativeDriver: true },
  );

  panX = new Animated.Value(0);
  panY = new Animated.Value(0);
  panEvent = Animated.event(
    [{
      nativeEvent: {
        translationX: this.panX,
        translationY: this.panY,
      },
    }],
    { useNativeDriver: true },
  );

  curScaleNum = 1;
  curXNum = 0;
  curYNum = 0;
  curScale = new Animated.Value(1);
  curX = new Animated.Value(0);
  curY = new Animated.Value(0);

  progress: Animated.Value;
  scale: Animated.Value;
  pinchX: Animated.Value;
  pinchY: Animated.Value;
  x: Animated.Value;
  y: Animated.Value;
  imageContainerOpacity: Animated.Value;

  constructor(props: Props) {
    super(props);

    const { height, width } = this.imageDimensions;
    const { height: screenHeight, width: screenWidth } = this.screenDimensions;
    const top = (screenHeight - height) / 2 + contentVerticalOffset;
    const left = (screenWidth - width) / 2;

    const { initialCoordinates } = props.navigation.state.params;
    const initialScale = new Animated.Value(initialCoordinates.width / width);
    const initialTranslateX = new Animated.Value(
      (initialCoordinates.x + initialCoordinates.width / 2)
        - (left + width / 2),
    );
    const initialTranslateY = new Animated.Value(
      (initialCoordinates.y + initialCoordinates.height / 2)
        - (top + height / 2),
    );

    const { position } = props.transitionProps;
    const { index } = props.scene;
    this.progress = position.interpolate({
      inputRange: [ index - 1, index ],
      outputRange: ([ 0, 1 ]: number[]),
      extrapolate: 'clamp',
    });
    this.imageContainerOpacity = this.progress.interpolate({
      inputRange: [ 0, 0.1 ],
      outputRange: ([ 0, 1 ]: number[]),
      extrapolate: 'clamp',
    });

    const reverseProgress = Animated.subtract(1, this.progress);
    this.scale = Animated.add(
      Animated.multiply(reverseProgress, initialScale),
      Animated.multiply(
        this.progress,
        Animated.multiply(this.curScale, this.pinchScale),
      ),
    );

    this.pinchX = Animated.multiply(
      Animated.subtract(1, this.pinchScale),
      Animated.subtract(
        Animated.subtract(
          this.pinchFocalX,
          this.curX,
        ),
        Animated.divide(
          this.props.transitionProps.layout.width,
          2,
        ),
      ),
    );
    this.x = Animated.add(
      Animated.multiply(reverseProgress, initialTranslateX),
      Animated.multiply(
        this.progress,
        Animated.add(
          this.curX,
          Animated.add(this.pinchX, this.panX),
        ),
      ),
    );

    this.pinchY = Animated.multiply(
      Animated.subtract(1, this.pinchScale),
      Animated.subtract(
        Animated.subtract(
          this.pinchFocalY,
          this.curY,
        ),
        Animated.divide(
          Animated.add(
            this.props.transitionProps.layout.height,
            contentVerticalOffset - contentBottomOffset,
          ),
          2,
        ),
      ),
    );
    this.y = Animated.add(
      Animated.multiply(reverseProgress, initialTranslateY),
      Animated.multiply(
        this.progress,
        Animated.add(
          this.curY,
          Animated.add(this.pinchY, this.panY),
        ),
      ),
    );
  }

  get screenDimensions(): Dimensions {
    const { screenDimensions } = this.props;
    if (contentVerticalOffset === 0) {
      return screenDimensions;
    }
    const { height, width } = screenDimensions;
    return { height: height - contentVerticalOffset, width };
  }

  get imageDimensions(): Dimensions {
    const { height: screenHeight, width: maxWidth } = this.screenDimensions;
    const maxHeight = screenHeight - 100; // space for close button
    const { dimensions } = this.props.navigation.state.params.media;
    if (dimensions.height < maxHeight && dimensions.width < maxWidth) {
      return dimensions;
    }
    const heightRatio = maxHeight / dimensions.height;
    const widthRatio = maxWidth / dimensions.width;
    if (heightRatio < widthRatio) {
      return {
        height: maxHeight,
        width: dimensions.width * heightRatio,
      };
    } else {
      return {
        width: maxWidth,
        height: dimensions.height * widthRatio,
      };
    }
  }

  get imageContainerStyle() {
    const { height, width } = this.imageDimensions;
    const { height: screenHeight, width: screenWidth } = this.screenDimensions;
    const top = (screenHeight - height) / 2 + contentVerticalOffset;
    const left = (screenWidth - width) / 2;
    const { verticalBounds } = this.props.navigation.state.params;
    return {
      height,
      width,
      marginTop: top - verticalBounds.y,
      marginLeft: left,
      opacity: this.imageContainerOpacity,
      transform: [
        { translateX: this.x },
        { translateY: this.y },
        { scale: this.scale },
      ],
    };
  }

  get isActive() {
    const { index } = this.props.scene;
    return index === this.props.transitionProps.index;
  }

  get contentContainerStyle() {
    const { verticalBounds } = this.props.navigation.state.params;
    const fullScreenHeight = this.screenDimensions.height
      + contentBottomOffset
      + contentVerticalOffset;
    const top = verticalBounds.y;
    const bottom = fullScreenHeight - verticalBounds.y - verticalBounds.height;

    // margin will clip, but padding won't
    const verticalStyle = this.isActive
      ? { paddingTop: top, paddingBottom: bottom }
      : { marginTop: top, marginBottom: bottom };
    return [ styles.contentContainer, verticalStyle ];
  }

  render() {
    const { media } = this.props.navigation.state.params;
    const statusBar = this.isActive
      ? <ConnectedStatusBar barStyle="light-content" />
      : null;
    const backdropStyle = { opacity: this.progress };
    const view = (
      <Animated.View style={styles.container}>
        {statusBar}
        <Animated.View style={[ styles.backdrop, backdropStyle ]} />
        <View style={this.contentContainerStyle}>
          <TouchableWithoutFeedback onPress={this.close}>
            <View style={styles.cover} />
          </TouchableWithoutFeedback>
          <Animated.View style={this.imageContainerStyle}>
            <Multimedia media={media} spinnerColor="white" />
          </Animated.View>
        </View>
        <Animated.View style={[ styles.closeButtonContainer, backdropStyle ]}>
          <TouchableOpacity onPress={this.close}>
            <Icon name="x-circle" style={styles.closeButton} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
    return (
      <PinchGestureHandler
        onGestureEvent={this.pinchEvent}
        onHandlerStateChange={this.onPinchHandlerStateChange}
      >
        <Animated.View style={styles.container}>
          <PanGestureHandler
            onGestureEvent={this.panEvent}
            onHandlerStateChange={this.onPanHandlerStateChange}
          >
            {view}
          </PanGestureHandler>
        </Animated.View>
      </PinchGestureHandler>
    );
  }

  close = () => {
    this.props.navigation.goBack();
  }

  onPinchHandlerStateChange = (
    event: { nativeEvent: {
      state: number,
      oldState: number,
      scale: number,
      focalX: number,
      focalY: number,
    } },
  ) => {
    const { state, oldState, scale, focalX, focalY } = event.nativeEvent;
    if (state === GestureState.ACTIVE || oldState !== GestureState.ACTIVE) {
      return;
    }
    this.curScaleNum *= event.nativeEvent.scale;
    this.curScale.setValue(this.curScaleNum);

    // Keep this logic in sync with pinchX/pinchY definitions in constructor.
    // Note however that this.screenDimensions.height is not the same as
    // this.props.transitionProps.layout.height. The latter includes both
    // contentVerticalOffset and contentBottomOffset.
    const { height: screenHeight, width: screenWidth } = this.screenDimensions;
    this.curXNum += (1 - scale)
      * (focalX - this.curXNum - screenWidth / 2);
    this.curYNum += (1 - scale)
      * (focalY - this.curYNum - screenHeight / 2 - contentVerticalOffset);
    this.curX.setValue(this.curXNum);
    this.curY.setValue(this.curYNum);

    this.pinchScale.setValue(1);
  }

  onPanHandlerStateChange = (
    event: { nativeEvent: {
      state: number,
      oldState: number,
      translationX: number,
      translationY: number,
    } },
  ) => {
    const { state, oldState } = event.nativeEvent;
    if (state === GestureState.ACTIVE || oldState !== GestureState.ACTIVE) {
      return;
    }
    this.curXNum += event.nativeEvent.translationX;
    this.curYNum += event.nativeEvent.translationY;
    this.curX.setValue(this.curXNum);
    this.curY.setValue(this.curYNum);
    this.panX.setValue(0);
    this.panY.setValue(0);
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
  contentContainer: {
    flex: 1,
    overflow: "hidden",
  },
  cover: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  closeButtonContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? contentVerticalOffset : 6,
    right: 12,
  },
  closeButton: {
    fontSize: 36,
    color: "white",
  },
});

export default connect(
  (state: AppState) => ({
    screenDimensions: dimensionsSelector(state),
  }),
)(MultimediaModal);
