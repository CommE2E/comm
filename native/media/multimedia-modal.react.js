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
import { clamp } from '../utils/animation-utils';

const {
  Value,
  Clock,
  event,
  Extrapolate,
  set,
  cond,
  not,
  and,
  or,
  eq,
  neq,
  add,
  sub,
  multiply,
  divide,
  max,
  interpolate,
  startClock,
  stopClock,
  clockRunning,
  timing,
} = Animated;

function scaleDelta(value: Value, gestureActive: Value) {
  const diffThisFrame = new Value(1);
  const prevValue = new Value(1);
  return cond(
    gestureActive,
    [
      set(diffThisFrame, divide(value, prevValue)),
      set(prevValue, value),
      diffThisFrame,
    ],
    set(prevValue, 1),
  );
}

function panDelta(value: Value, gestureActive: Value) {
  const diffThisFrame = new Value(0);
  const prevValue = new Value(0);
  return cond(
    gestureActive,
    [
      set(diffThisFrame, sub(value, prevValue)),
      set(prevValue, value),
      diffThisFrame,
    ],
    set(prevValue, 0),
  );
}

function runTiming(
  clock: Clock,
  initialValue: Value,
  finalValue: Value,
): Value {
  const state = {
    finished: new Value(0),
    position: new Value(0),
    frameTime: new Value(0),
    time: new Value(0),
  };
  const config = {
    toValue: new Value(0),
    duration: 250,
    easing: Easing.out(Easing.ease),
  };
  return [
    cond(
      not(clockRunning(clock)),
      [
        set(state.finished, 0),
        set(state.frameTime, 0),
        set(state.time, 0),
        set(state.position, initialValue),
        set(config.toValue, finalValue),
        startClock(clock),
      ],
    ),
    timing(clock, state, config),
    cond(
      state.finished,
      stopClock(clock),
    ),
    state.position,
  ];
}

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
  position: Value,
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
    position: PropTypes.instanceOf(Value).isRequired,
    scene: PropTypes.object.isRequired,
    screenDimensions: dimensionsPropType.isRequired,
    contentVerticalOffset: PropTypes.number.isRequired,
  };

  centerX = new Value(0);
  centerY = new Value(0);
  screenWidth = new Value(0);
  screenHeight = new Value(0);
  imageWidth = new Value(0);
  imageHeight = new Value(0);

  pinchHandler = React.createRef();
  pinchEvent;
  panEvent;

  progress: Value;
  scale: Value;
  x: Value;
  y: Value;
  imageContainerOpacity: Value;

  constructor(props: Props) {
    super(props);
    this.updateDimensions();

    const { screenWidth, screenHeight, imageWidth, imageHeight } = this;
    const left = sub(this.centerX, divide(imageWidth, 2));
    const top = sub(this.centerY, divide(imageHeight, 2));

    const { initialCoordinates } = props.navigation.state.params;
    const initialScale = divide(
      initialCoordinates.width,
      imageWidth,
    );
    const initialTranslateX = sub(
      initialCoordinates.x + initialCoordinates.width / 2,
      add(left, divide(imageWidth, 2)),
    );
    const initialTranslateY = sub(
      initialCoordinates.y + initialCoordinates.height / 2,
      add(top, divide(imageHeight, 2)),
    );

    const { position } = props;
    const { index } = props.scene;
    this.progress = interpolate(
      position,
      {
        inputRange: [ index - 1, index ],
        outputRange: [ 0, 1 ],
        extrapolate: Extrapolate.CLAMP,
      },
    );
    this.imageContainerOpacity = interpolate(
      this.progress,
      {
        inputRange: [ 0, 0.1 ],
        outputRange: [ 0, 1 ],
        extrapolate: Extrapolate.CLAMP,
      },
    );

    // The inputs we receive from PanGestureHandler
    const panState = new Value(-1);
    const panTranslationX = new Value(0);
    const panTranslationY = new Value(0);
    this.panEvent = event([{
      nativeEvent: {
        state: panState,
        translationX: panTranslationX,
        translationY: panTranslationY,
      },
    }]);
    const panActive = eq(panState, GestureState.ACTIVE);

    // The inputs we receive from PinchGestureHandler
    const pinchState = new Value(-1);
    const pinchScale = new Value(1);
    const pinchFocalX = new Value(0);
    const pinchFocalY = new Value(0);
    this.pinchEvent = event([{
      nativeEvent: {
        state: pinchState,
        scale: pinchScale,
        focalX: pinchFocalX,
        focalY: pinchFocalY,
      },
    }]);
    const pinchActive = eq(pinchState, GestureState.ACTIVE);

    // Shared between Pan/Pinch. After a gesture completes, values are
    // moved to these variables and then animated back to valid ranges
    const curScale = new Value(1);
    const curX = new Value(0);
    const curY = new Value(0);

    // The centered variables help us know if we need to be recentered
    const recenteredScale = max(curScale, 1);
    const horizontalPanSpace = this.horizontalPanSpace(recenteredScale);
    const verticalPanSpace = this.verticalPanSpace(recenteredScale);

    const resetScaleClock = new Clock();
    const resetXClock = new Clock();
    const resetYClock = new Clock();
    const gestureActive = or(pinchActive, panActive);

    const updates = [
      this.pinchUpdate(
        pinchActive,
        pinchScale,
        pinchFocalX,
        pinchFocalY,
        curScale,
        curX,
        curY,
      ),
      this.panUpdate(
        panActive,
        panTranslationX,
        panTranslationY,
        curX,
        curY,
      ),
      this.recenter(
        resetScaleClock,
        resetXClock,
        resetYClock,
        gestureActive,
        recenteredScale,
        horizontalPanSpace,
        verticalPanSpace,
        curScale,
        curX,
        curY,
      ),
    ];
    const updatedScale = [ updates, curScale ];
    const updatedCurX = [ updates, curX ];
    const updatedCurY = [ updates, curY ];

    const reverseProgress = sub(1, this.progress);
    this.scale = add(
      multiply(reverseProgress, initialScale),
      multiply(this.progress, updatedScale),
    );
    this.x = add(
      multiply(reverseProgress, initialTranslateX),
      multiply(this.progress, updatedCurX),
    );
    this.y = add(
      multiply(reverseProgress, initialTranslateY),
      multiply(this.progress, updatedCurY),
    );
  }

  // How much space do we have to pan the image horizontally?
  horizontalPanSpace(scale: Value) {
    const apparentWidth = multiply(this.imageWidth, scale);
    const horizPop = divide(
      sub(apparentWidth, this.screenWidth),
      2,
    );
    return max(horizPop, 0);
  }

  // How much space do we have to pan the image vertically?
  verticalPanSpace(scale: Value) {
    const apparentHeight = multiply(this.imageHeight, scale);
    const vertPop = divide(
      sub(apparentHeight, this.screenHeight),
      2,
    );
    return max(vertPop, 0);
  }

  pinchUpdate(
    // Inputs
    pinchActive: Value,
    pinchScale: Value,
    pinchFocalX: Value,
    pinchFocalY: Value,
    // Outputs
    curScale: Value,
    curX: Value,
    curY: Value,
  ): Value {
    const deltaScale = scaleDelta(pinchScale, pinchActive);
    const deltaPinchX = multiply(
      sub(1, deltaScale),
      sub(
        pinchFocalX,
        curX,
        this.centerX,
      ),
    );
    const deltaPinchY = multiply(
      sub(1, deltaScale),
      sub(
        pinchFocalY,
        curY,
        this.centerY,
      ),
    );

    return cond(
      [ deltaScale, pinchActive ],
      [
        set(curX, add(curX, deltaPinchX)),
        set(curY, add(curY, deltaPinchY)),
        set(curScale, multiply(curScale, deltaScale)),
      ],
    );
  }

  panUpdate(
    // Inputs
    panActive: Value,
    panTranslationX: Value,
    panTranslationY: Value,
    // Outputs
    curX: Value,
    curY: Value,
  ): Value {
    const deltaX = panDelta(panTranslationX, panActive);
    const deltaY = panDelta(panTranslationY, panActive);
    return cond(
      [ deltaX, deltaY, panActive ],
      [
        set(curX, add(curX, deltaX)),
        set(curY, add(curY, deltaY)),
      ],
    );
  }

  recenter(
    // Inputs
    resetScaleClock: Clock,
    resetXClock: Clock,
    resetYClock: Clock,
    gestureActive: Value,
    recenteredScale: Value,
    horizontalPanSpace: Value,
    verticalPanSpace: Value,
    // Outputs
    curScale: Value,
    curX: Value,
    curY: Value,
  ): Value {
    const recenteredX = clamp(
      curX,
      multiply(-1, horizontalPanSpace),
      horizontalPanSpace,
    );
    const recenteredY = clamp(
      curY,
      multiply(-1, verticalPanSpace),
      verticalPanSpace,
    );
    return cond(
      gestureActive,
      [
        stopClock(resetScaleClock),
        stopClock(resetXClock),
        stopClock(resetYClock),
      ],
      [
        cond(
          or(
            clockRunning(resetScaleClock),
            neq(recenteredScale, curScale),
          ),
          set(curScale, runTiming(resetScaleClock, curScale, recenteredScale)),
        ),
        cond(
          or(
            clockRunning(resetXClock),
            neq(recenteredX, curX),
          ),
          set(curX, runTiming(resetXClock, curX, recenteredX)),
        ),
        cond(
          or(
            clockRunning(resetYClock),
            neq(recenteredY, curY),
          ),
          set(curY, runTiming(resetYClock, curY, recenteredY)),
        ),
      ],
    );
  }

  updateDimensions() {
    const { width: screenWidth, height: screenHeight } = this.screenDimensions;
    this.screenWidth.setValue(screenWidth);
    this.screenHeight.setValue(screenHeight);

    this.centerX.setValue(screenWidth / 2);
    this.centerY.setValue(screenHeight / 2 + this.props.contentVerticalOffset);

    const { width, height } = this.imageDimensions;
    this.imageWidth.setValue(width);
    this.imageHeight.setValue(height);
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
      this.updateDimensions();
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
        onHandlerStateChange={this.pinchEvent}
        ref={this.pinchHandler}
      >
        <Animated.View style={styles.container}>
          <PanGestureHandler
            onGestureEvent={this.panEvent}
            onHandlerStateChange={this.panEvent}
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
