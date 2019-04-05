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
import type { AppState } from '../redux/redux-setup';
import { type VerticalBounds, verticalBoundsPropType } from './vertical-bounds';

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import PropTypes from 'prop-types';
import {
  PinchGestureHandler,
  PanGestureHandler,
  State as GestureState,
} from 'react-native-gesture-handler';
import Orientation from 'react-native-orientation-locker';
import Animated, { Easing } from 'react-native-reanimated';

import { connect } from 'lib/utils/redux-utils';

import {
  contentBottomOffset,
  dimensionsSelector,
  contentVerticalOffsetSelector,
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
  position: Animated.Value,
  // Redux state
  screenDimensions: Dimensions,
  contentVerticalOffset: number,
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
    position: PropTypes.instanceOf(Animated.Value).isRequired,
    scene: PropTypes.object.isRequired,
    screenDimensions: dimensionsPropType.isRequired,
    contentVerticalOffset: PropTypes.number.isRequired,
  };

  centerXNum: number;
  centerYNum: number;
  centerX = new Animated.Value(0);
  centerY = new Animated.Value(0);

  pinchHandler: React.Ref<PinchGestureHandler> = React.createRef();
  pinchScale = new Animated.Value(1);
  pinchFocalX = new Animated.Value(0);
  pinchFocalY = new Animated.Value(0);
  pinchEvent = Animated.event([{
    nativeEvent: {
      scale: this.pinchScale,
      focalX: this.pinchFocalX,
      focalY: this.pinchFocalY,
    },
  }]);

  panX = new Animated.Value(0);
  panY = new Animated.Value(0);
  panEvent = Animated.event([{
    nativeEvent: {
      translationX: this.panX,
      translationY: this.panY,
    },
  }]);

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
    this.updateCenter();

    const { height, width } = this.imageDimensions;
    const { height: screenHeight, width: screenWidth } = this.screenDimensions;
    const top = (screenHeight - height) / 2 + props.contentVerticalOffset;
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

    const { position } = props;
    const { index } = props.scene;
    this.progress = Animated.interpolate(
      position,
      {
        inputRange: [ index - 1, index ],
        outputRange: ([ 0, 1 ]: number[]),
        extrapolate: 'clamp',
      },
    );
    this.imageContainerOpacity = Animated.interpolate(
      this.progress,
      {
        inputRange: [ 0, 0.1 ],
        outputRange: ([ 0, 1 ]: number[]),
        extrapolate: 'clamp',
      },
    );

    const reverseProgress = Animated.sub(1, this.progress);
    this.scale = Animated.add(
      Animated.multiply(reverseProgress, initialScale),
      Animated.multiply(
        this.progress,
        Animated.multiply(this.curScale, this.pinchScale),
      ),
    );

    this.pinchX = Animated.multiply(
      Animated.sub(1, this.pinchScale),
      Animated.sub(
        this.pinchFocalX,
        this.curX,
        this.centerX,
      ),
    );
    this.x = Animated.add(
      Animated.multiply(reverseProgress, initialTranslateX),
      Animated.multiply(
        this.progress,
        Animated.add(
          this.curX,
          this.pinchX,
          this.panX,
        ),
      ),
    );

    this.pinchY = Animated.multiply(
      Animated.sub(1, this.pinchScale),
      Animated.sub(
        this.pinchFocalY,
        this.curY,
        this.centerY,
      ),
    );
    this.y = Animated.add(
      Animated.multiply(reverseProgress, initialTranslateY),
      Animated.multiply(
        this.progress,
        Animated.add(
          this.curY,
          this.pinchY,
          this.panY,
        ),
      ),
    );
  }

  updateCenter() {
    const { height: screenHeight, width: screenWidth } = this.screenDimensions;
    this.centerXNum = screenWidth / 2;
    this.centerYNum = screenHeight / 2 + this.props.contentVerticalOffset;
    this.centerX.setValue(this.centerXNum);
    this.centerY.setValue(this.centerYNum);
  }

  componentDidMount() {
    if (MultimediaModal.isActive(this.props)) {
      Orientation.unlockAllOrientations();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.screenDimensions !== prevProps.screenDimensions ||
      this.props.contentVerticalOffset !== prevProps.contentVerticalOffset
    ) {
      this.updateCenter();
    }

    const isActive = MultimediaModal.isActive(this.props);
    const wasActive = MultimediaModal.isActive(prevProps);
    if (isActive && !wasActive) {
      Orientation.unlockAllOrientations();
    } else if (!isActive && wasActive) {
      Orientation.lockToPortrait();
    }
  }

  get screenDimensions(): Dimensions {
    const { screenDimensions, contentVerticalOffset } = this.props;
    if (contentVerticalOffset === 0) {
      return screenDimensions;
    }
    const { height, width } = screenDimensions;
    return { height: height - contentVerticalOffset, width };
  }

  get imageDimensions(): Dimensions {
    // Make space for the close button
    let { height: maxHeight, width: maxWidth } = this.screenDimensions;
    if (maxHeight > maxWidth) {
      maxHeight -= 100;
    } else {
      maxWidth -= 100;
    }

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
    const top = (screenHeight - height) / 2 + this.props.contentVerticalOffset;
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

  static isActive(props) {
    const { index } = props.scene;
    return index === props.transitionProps.index;
  }

  get contentContainerStyle() {
    const { verticalBounds } = this.props.navigation.state.params;
    const fullScreenHeight = this.screenDimensions.height
      + contentBottomOffset
      + this.props.contentVerticalOffset;
    const top = verticalBounds.y;
    const bottom = fullScreenHeight - verticalBounds.y - verticalBounds.height;

    // margin will clip, but padding won't
    const verticalStyle = MultimediaModal.isActive(this.props)
      ? { paddingTop: top, paddingBottom: bottom }
      : { marginTop: top, marginBottom: bottom };
    return [ styles.contentContainer, verticalStyle ];
  }

  render() {
    const { media } = this.props.navigation.state.params;
    const statusBar = MultimediaModal.isActive(this.props)
      ? <ConnectedStatusBar barStyle="light-content" />
      : null;
    const backdropStyle = { opacity: this.progress };
    const closeButtonStyle = {
      opacity: this.progress,
      top: Math.max(this.props.contentVerticalOffset, 6),
    };
    const view = (
      <Animated.View style={styles.container}>
        {statusBar}
        <Animated.View style={[ styles.backdrop, backdropStyle ]} />
        <View style={this.contentContainerStyle}>
          <Animated.View style={this.imageContainerStyle}>
            <Multimedia media={media} spinnerColor="white" />
          </Animated.View>
        </View>
        <Animated.View style={[
          styles.closeButtonContainer,
          closeButtonStyle,
        ]}>
          <TouchableOpacity onPress={this.close}>
            <Text style={styles.closeButton}>
              ×
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
    return (
      <PinchGestureHandler
        onGestureEvent={this.pinchEvent}
        onHandlerStateChange={this.onPinchHandlerStateChange}
        ref={this.pinchHandler}
      >
        <Animated.View style={styles.container}>
          <PanGestureHandler
            onGestureEvent={this.panEvent}
            onHandlerStateChange={this.onPanHandlerStateChange}
            simultaneousHandlers={this.pinchHandler}
            avgTouches
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

    this.pinchScale.setValue(1);
    this.pinchFocalX.setValue(this.centerXNum);
    this.pinchFocalY.setValue(this.centerYNum);

    this.curScaleNum *= scale;
    this.curScale.setValue(this.curScaleNum);

    // Keep this logic in sync with pinchX/pinchY definitions in constructor
    this.curXNum += (1 - scale) * (focalX - this.curXNum - this.centerXNum);
    this.curYNum += (1 - scale) * (focalY - this.curYNum - this.centerYNum);
    this.curX.setValue(this.curXNum);
    this.curY.setValue(this.curYNum);

    this.recenter();
  }

  onPanHandlerStateChange = (
    event: { nativeEvent: {
      state: number,
      oldState: number,
      translationX: number,
      translationY: number,
    } },
  ) => {
    const { state, oldState, translationX, translationY } = event.nativeEvent;
    if (state === GestureState.ACTIVE || oldState !== GestureState.ACTIVE) {
      return;
    }

    this.panX.setValue(0);
    this.panY.setValue(0);

    this.curXNum += translationX;
    this.curYNum += translationY;
    this.curX.setValue(this.curXNum);
    this.curY.setValue(this.curYNum);

    this.recenter();
  }

  get nextScale() {
    return Math.max(this.curScaleNum, 1);
  }

  // How much space do we have to pan the image horizontally?
  get horizontalPanSpace() {
    const { nextScale } = this;
    const { width } = this.imageDimensions;
    const apparentWidth = nextScale * width;
    const screenWidth = this.screenDimensions.width;
    const horizPop = (apparentWidth - screenWidth) / 2;
    return Math.max(horizPop, 0);
  }

  // How much space do we have to pan the image vertically?
  get verticalPanSpace() {
    const { nextScale } = this;
    const { height } = this.imageDimensions;
    const apparentHeight = nextScale * height;
    const screenHeight = this.screenDimensions.height;
    const vertPop = (apparentHeight - screenHeight) / 2;
    return Math.max(vertPop, 0);
  }

  // Figures out what we need to add to this.curX to make it "centered"
  get centerDeltaX() {
    const { curXNum, horizontalPanSpace } = this;

    const rightOverscroll = curXNum - horizontalPanSpace;
    if (rightOverscroll > 0) {
      return rightOverscroll * -1;
    }

    const leftOverscroll = curXNum + horizontalPanSpace;
    if (leftOverscroll < 0) {
      return leftOverscroll * -1;
    }

    return 0;
  }

  // Figures out what we need to add to this.curY to make it "centered"
  get centerDeltaY() {
    const { curYNum, verticalPanSpace } = this;

    const bottomOverscroll = curYNum - verticalPanSpace;
    if (bottomOverscroll > 0) {
      return bottomOverscroll * -1;
    }

    const topOverscroll = curYNum + verticalPanSpace;
    if (topOverscroll < 0) {
      return topOverscroll * -1;
    }

    return 0;
  }

  recenter() {
    const { nextScale, centerDeltaX, centerDeltaY } = this;

    const config = {
      duration: 250,
      easing: Easing.out(Easing.ease),
    };
    if (nextScale !== this.curScaleNum) {
      Animated.timing(
        this.curScale,
        { ...config, toValue: nextScale },
      ).start(({ finished }) => {
        if (!finished) {
          return;
        }
        this.curScaleNum = nextScale;
      });
    }
    if (centerDeltaX !== 0) {
      Animated.timing(
        this.curX,
        { ...config, toValue: this.curXNum + centerDeltaX },
      ).start(({ finished }) => {
        if (!finished) {
          return;
        }
        this.curXNum += centerDeltaX;
      });
    }
    if (centerDeltaY !== 0) {
      Animated.timing(
        this.curY,
        { ...config, toValue: this.curYNum + centerDeltaY },
      ).start(({ finished }) => {
        if (!finished) {
          return;
        }
        this.curYNum += centerDeltaY;
      });
    }
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
  closeButtonContainer: {
    position: "absolute",
    right: 12,
  },
  closeButton: {
    fontSize: 36,
    color: "white",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default connect(
  (state: AppState) => ({
    screenDimensions: dimensionsSelector(state),
    contentVerticalOffset: contentVerticalOffsetSelector(state),
  }),
)(MultimediaModal);
