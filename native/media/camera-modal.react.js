// @flow

import type {
  NavigationStackProp,
  NavigationLeafRoute,
  NavigationStackScene,
  NavigationStackTransitionProps,
} from 'react-navigation-stack';
import type { AppState } from '../redux/redux-setup';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import { updateDeviceCameraInfoActionType } from '../redux/action-types';
import {
  type DeviceCameraInfo,
  deviceCameraInfoPropType,
} from '../types/camera';
import type { Orientations } from 'react-native-orientation-locker';
import {
  type ChatInputState,
  chatInputStatePropType,
  withChatInputState,
  type ClientImageInfo,
} from '../chat/chat-input-state';
import type { ViewStyle } from '../types/styles';

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import PropTypes from 'prop-types';
import Animated, { Easing } from 'react-native-reanimated';
import { RNCamera } from 'react-native-camera';
import {
  PinchGestureHandler,
  TapGestureHandler,
  State as GestureState,
} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import Orientation from 'react-native-orientation-locker';
import invariant from 'invariant';
import filesystem from 'react-native-fs';

import { connect } from 'lib/utils/redux-utils';
import { pathFromURI, filenameFromPathOrURI } from 'lib/utils/file-utils';

import {
  contentBottomOffset,
  dimensionsSelector,
  contentVerticalOffsetSelector,
} from '../selectors/dimension-selectors';
import ConnectedStatusBar from '../connected-status-bar.react';
import { clamp, gestureJustEnded } from '../utils/animation-utils';
import ContentLoading from '../components/content-loading.react';
import { colors } from '../themes/colors';
import { saveImage } from './save-image';
import SendMediaButton from './send-media-button.react';

const {
  Value,
  Clock,
  event,
  Extrapolate,
  block,
  set,
  call,
  cond,
  not,
  and,
  or,
  eq,
  greaterThan,
  lessThan,
  add,
  sub,
  multiply,
  divide,
  abs,
  interpolate,
  startClock,
  stopClock,
  clockRunning,
  timing,
  spring,
  SpringUtils,
} = Animated;
const maxZoom = 8;
const zoomUpdateFactor = (() => {
  if (Platform.OS === "ios") {
    return 0.002;
  }
  if (Platform.OS === "android" && Platform.Version > 26) {
    return 0.005;
  }
  if (Platform.OS === "android" && Platform.Version > 23) {
    return 0.01;
  }
  return 0.03;
})();
const permissionRationale = {
  title: "Access Your Camera",
  message: "Requesting access to your device camera",
};

const stagingModeAnimationConfig = {
  duration: 150,
  easing: Easing.inOut(Easing.ease),
};

const indicatorSpringConfig = {
  ...SpringUtils.makeDefaultConfig(),
  damping: 0,
  mass: 0.6,
  toValue: 1,
};
const indicatorTimingConfig = {
  duration: 500,
  easing: Easing.out(Easing.ease),
  toValue: 0,
};
function runIndicatorAnimation(
  // Inputs
  springClock: Clock,
  delayClock: Clock,
  timingClock: Clock,
  animationRunning: Value,
  // Outputs
  scale: Value,
  opacity: Value,
): Value {
  const delayStart = new Value(0);

  const springScale = new Value(0.75);
  const delayScale = new Value(0);
  const timingScale = new Value(0.75);

  const animatedScale = cond(
    clockRunning(springClock),
    springScale,
    cond(
      clockRunning(delayClock),
      delayScale,
      timingScale,
    ),
  );
  const lastAnimatedScale = new Value(0.75);
  const numScaleLoops = new Value(0);

  const springState = {
    finished: new Value(1),
    velocity: new Value(0),
    time: new Value(0),
    position: springScale,
  };
  const timingState = {
    finished: new Value(1),
    frameTime: new Value(0),
    time: new Value(0),
    position: timingScale,
  };

  return block([
    cond(
      not(animationRunning),
      [
        set(springState.finished, 0),
        set(springState.velocity, 0),
        set(springState.time, 0),
        set(springScale, 0.75),
        set(lastAnimatedScale, 0.75),
        set(numScaleLoops, 0),
        set(opacity, 1),
        startClock(springClock),
      ],
    ),
    [
      cond(
        clockRunning(springClock),
        spring(springClock, springState, indicatorSpringConfig),
      ),
      timing(timingClock, timingState, indicatorTimingConfig),
    ],
    [
      cond(
        and(
          greaterThan(animatedScale, 1.2),
          not(greaterThan(lastAnimatedScale, 1.2)),
        ),
        [
          set(numScaleLoops, add(numScaleLoops, 1)),
          cond(
            greaterThan(numScaleLoops, 1),
            [
              set(springState.finished, 1),
              stopClock(springClock),
              set(delayScale, springScale),
              set(delayStart, delayClock),
              startClock(delayClock),
            ],
          ),
        ],
      ),
      set(lastAnimatedScale, animatedScale),
    ],
    cond(
      and(
        clockRunning(delayClock),
        greaterThan(delayClock, add(delayStart, 400)),
      ),
      [
        stopClock(delayClock),
        set(timingState.finished, 0),
        set(timingState.frameTime, 0),
        set(timingState.time, 0),
        set(timingScale, delayScale),
        startClock(timingClock),
      ],
    ),
    cond(
      and(springState.finished, timingState.finished),
      stopClock(timingClock),
    ),
    set(scale, animatedScale),
    cond(
      clockRunning(timingClock),
      set(
        opacity,
        clamp(animatedScale, 0, 1),
      ),
    ),
  ]);
}

type NavProp = NavigationStackProp<{|
  ...NavigationLeafRoute,
  params: {|
    threadID: string,
  |},
|}>;

type Props = {
  navigation: NavProp,
  scene: NavigationStackScene,
  transitionProps: NavigationStackTransitionProps,
  position: Value,
  // Redux state
  screenDimensions: Dimensions,
  contentVerticalOffset: number,
  deviceCameraInfo: DeviceCameraInfo,
  deviceOrientation: Orientations,
  foreground: bool,
  // withChatInputState
  chatInputState: ?ChatInputState,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
type State = {|
  zoom: number,
  useFrontCamera: bool,
  hasCamerasOnBothSides: bool,
  flashMode: number,
  autoFocusPointOfInterest: ?{| x: number, y: number, autoExposure?: bool |},
  stagingMode: bool,
  pendingImageInfo: ?ClientImageInfo,
|};
class CameraModal extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          threadID: PropTypes.string.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    scene: PropTypes.object.isRequired,
    transitionProps: PropTypes.object.isRequired,
    position: PropTypes.instanceOf(Value).isRequired,
    screenDimensions: dimensionsPropType.isRequired,
    contentVerticalOffset: PropTypes.number.isRequired,
    deviceCameraInfo: deviceCameraInfoPropType.isRequired,
    deviceOrientation: PropTypes.string.isRequired,
    foreground: PropTypes.bool.isRequired,
    chatInputState: chatInputStatePropType,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  camera: ?RNCamera;

  pinchEvent;
  pinchHandler = React.createRef();
  tapEvent;
  tapHandler = React.createRef();
  navigationProgress: Value;
  animationCode: Value;

  closeButton: ?TouchableOpacity;
  closeButtonX = new Value(-1);
  closeButtonY = new Value(-1);
  closeButtonWidth = new Value(0);
  closeButtonHeight = new Value(0);

  photoButton: ?TouchableOpacity;
  photoButtonX = new Value(-1);
  photoButtonY = new Value(-1);
  photoButtonWidth = new Value(0);
  photoButtonHeight = new Value(0);

  switchCameraButton: ?TouchableOpacity;
  switchCameraButtonX = new Value(-1);
  switchCameraButtonY = new Value(-1);
  switchCameraButtonWidth = new Value(0);
  switchCameraButtonHeight = new Value(0);

  flashButton: ?TouchableOpacity;
  flashButtonX = new Value(-1);
  flashButtonY = new Value(-1);
  flashButtonWidth = new Value(0);
  flashButtonHeight = new Value(0);

  focusIndicatorX = new Value(-1);
  focusIndicatorY = new Value(-1);
  focusIndicatorScale = new Value(0);
  focusIndicatorOpacity = new Value(0);

  cancelIndicatorAnimation = new Value(0);

  cameraIDsFetched = false;

  stagingModeProgress = new Value(0);
  sendButtonProgress = new Value(0);
  sendButtonStyle: ViewStyle;
  overlayStyle: ViewStyle;

  constructor(props: Props) {
    super(props);

    this.state = {
      zoom: 0,
      useFrontCamera: props.deviceCameraInfo.defaultUseFrontCamera,
      hasCamerasOnBothSides: props.deviceCameraInfo.hasCamerasOnBothSides,
      flashMode: RNCamera.Constants.FlashMode.off,
      autoFocusPointOfInterest: undefined,
      stagingMode: false,
      pendingImageInfo: undefined,
    };

    const { position } = props;
    const { index } = props.scene;
    this.navigationProgress = interpolate(
      position,
      {
        inputRange: [ index - 1, index ],
        outputRange: [ 0, 1 ],
        extrapolate: Extrapolate.CLAMP,
      },
    );

    const sendButtonScale = interpolate(
      this.sendButtonProgress,
      {
        inputRange: [ 0, 1 ],
        outputRange: [ 1.1, 1 ],
      },
    );
    this.sendButtonStyle = {
      opacity: this.sendButtonProgress,
      transform: [
        { scale: sendButtonScale },
      ],
    };

    const overlayOpacity = interpolate(
      this.stagingModeProgress,
      {
        inputRange: [ 0, 0.01, 1 ],
        outputRange: [ 0, 0.5, 0 ],
        extrapolate: Extrapolate.CLAMP,
      },
    );
    this.overlayStyle = {
      ...styles.overlay,
      opacity: overlayOpacity,
    };

    const pinchState = new Value(-1);
    const pinchScale = new Value(1);
    this.pinchEvent = event([{
      nativeEvent: {
        state: pinchState,
        scale: pinchScale,
      },
    }]);

    const tapState = new Value(-1);
    const tapX = new Value(0);
    const tapY = new Value(0);
    this.tapEvent = event([{
      nativeEvent: {
        state: tapState,
        x: tapX,
        y: tapY,
      },
    }]);

    this.animationCode = block([
      this.zoomAnimationCode(pinchState, pinchScale),
      this.focusAnimationCode(tapState, tapX, tapY),
    ]);
  }

  zoomAnimationCode(pinchState: Value, pinchScale: Value): Value {
    const pinchJustEnded = gestureJustEnded(pinchState);

    const zoomBase = new Value(1);
    const zoomReported = new Value(1);

    const currentZoom = interpolate(
      multiply(zoomBase, pinchScale),
      {
        inputRange: [ 1, 8 ],
        outputRange: [ 1, 8 ],
        extrapolate: Extrapolate.CLAMP,
      },
    );
    const cameraZoomFactor = interpolate(
      zoomReported,
      {
        inputRange: [ 1, 8 ],
        outputRange: [ 0, 1 ],
        extrapolate: Extrapolate.CLAMP,
      },
    );
    const resolvedZoom = cond(
      eq(pinchState, GestureState.ACTIVE),
      currentZoom,
      zoomBase,
    );

    return [
      cond(
        pinchJustEnded,
        set(zoomBase, currentZoom),
      ),
      cond(
        or(
          pinchJustEnded,
          greaterThan(
            abs(sub(divide(resolvedZoom, zoomReported), 1)),
            zoomUpdateFactor,
          ),
        ),
        [
          set(zoomReported, resolvedZoom),
          call(
            [ cameraZoomFactor ],
            this.updateZoom,
          ),
        ],
      ),
    ];
  }

  focusAnimationCode(tapState: Value, tapX: Value, tapY: Value): Value {
    const lastTapX = new Value(0);
    const lastTapY = new Value(0);
    const fingerJustReleased = and(
      gestureJustEnded(tapState),
      this.outsideButtons(lastTapX, lastTapY),
    );

    const indicatorSpringClock = new Clock();
    const indicatorDelayClock = new Clock();
    const indicatorTimingClock = new Clock();
    const indicatorAnimationRunning = or(
      clockRunning(indicatorSpringClock),
      clockRunning(indicatorDelayClock),
      clockRunning(indicatorTimingClock),
    );

    return [
      cond(
        fingerJustReleased,
        [
          call(
            [ tapX, tapY ],
            this.focusOnPoint,
          ),
          set(this.focusIndicatorX, tapX),
          set(this.focusIndicatorY, tapY),
          stopClock(indicatorSpringClock),
          stopClock(indicatorDelayClock),
          stopClock(indicatorTimingClock),
        ],
      ),
      cond(
        this.cancelIndicatorAnimation,
        [
          set(this.cancelIndicatorAnimation, 0),
          stopClock(indicatorSpringClock),
          stopClock(indicatorDelayClock),
          stopClock(indicatorTimingClock),
          set(this.focusIndicatorOpacity, 0),
        ],
      ),
      cond(
        or(fingerJustReleased, indicatorAnimationRunning),
        runIndicatorAnimation(
          indicatorSpringClock,
          indicatorDelayClock,
          indicatorTimingClock,
          indicatorAnimationRunning,
          this.focusIndicatorScale,
          this.focusIndicatorOpacity,
        ),
      ),
      set(lastTapX, tapX),
      set(lastTapY, tapY),
    ];
  }

  outsideButtons(x: Value, y: Value) {
    const {
      closeButtonX,
      closeButtonY,
      closeButtonWidth,
      closeButtonHeight,
      photoButtonX,
      photoButtonY,
      photoButtonWidth,
      photoButtonHeight,
      switchCameraButtonX,
      switchCameraButtonY,
      switchCameraButtonWidth,
      switchCameraButtonHeight,
      flashButtonX,
      flashButtonY,
      flashButtonWidth,
      flashButtonHeight,
    } = this;
    return and(
      or(
        lessThan(x, closeButtonX),
        greaterThan(x, add(closeButtonX, closeButtonWidth)),
        lessThan(y, closeButtonY),
        greaterThan(y, add(closeButtonY, closeButtonHeight)),
      ),
      or(
        lessThan(x, photoButtonX),
        greaterThan(x, add(photoButtonX, photoButtonWidth)),
        lessThan(y, photoButtonY),
        greaterThan(y, add(photoButtonY, photoButtonHeight)),
      ),
      or(
        lessThan(x, switchCameraButtonX),
        greaterThan(x, add(switchCameraButtonX, switchCameraButtonWidth)),
        lessThan(y, switchCameraButtonY),
        greaterThan(y, add(switchCameraButtonY, switchCameraButtonHeight)),
      ),
      or(
        lessThan(x, flashButtonX),
        greaterThan(x, add(flashButtonX, flashButtonWidth)),
        lessThan(y, flashButtonY),
        greaterThan(y, add(flashButtonY, flashButtonHeight)),
      ),
    );
  }

  static isActive(props) {
    const { index } = props.scene;
    return index === props.transitionProps.index;
  }

  componentDidMount() {
    if (CameraModal.isActive(this.props)) {
      Orientation.unlockAllOrientations();
    }
  }

  componentWillUnmount() {
    if (CameraModal.isActive(this.props)) {
      Orientation.lockToPortrait();
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const isActive = CameraModal.isActive(this.props);
    const wasActive = CameraModal.isActive(prevProps);
    if (isActive && !wasActive) {
      Orientation.unlockAllOrientations();
    } else if (!isActive && wasActive) {
      Orientation.lockToPortrait();
    }

    if (!this.state.hasCamerasOnBothSides && prevState.hasCamerasOnBothSides) {
      this.switchCameraButtonX.setValue(-1);
      this.switchCameraButtonY.setValue(-1);
      this.switchCameraButtonWidth.setValue(0);
      this.switchCameraButtonHeight.setValue(0);
    }

    if (this.props.deviceOrientation !== prevProps.deviceOrientation) {
      this.setState({ autoFocusPointOfInterest: null });
      this.cancelIndicatorAnimation.setValue(1);
    }

    if (this.props.foreground && !prevProps.foreground && this.camera) {
      this.camera.refreshAuthorizationStatus();
    }

    if (this.state.stagingMode && !prevState.stagingMode) {
      this.cancelIndicatorAnimation.setValue(1);
      this.focusIndicatorOpacity.setValue(0);
      timing(
        this.stagingModeProgress,
        { ...stagingModeAnimationConfig, toValue: 1 },
      ).start();
    } else if (!this.state.stagingMode && prevState.stagingMode) {
      this.stagingModeProgress.setValue(0);
    }

    if (this.state.pendingImageInfo && !prevState.pendingImageInfo) {
      timing(
        this.sendButtonProgress,
        { ...stagingModeAnimationConfig, toValue: 1 },
      ).start();
    } else if (!this.state.pendingImageInfo && prevState.pendingImageInfo) {
      CameraModal.cleanUpPendingImageInfo(prevState.pendingImageInfo);
      this.sendButtonProgress.setValue(0);
    }
  }

  static async cleanUpPendingImageInfo(pendingImageInfo: ClientImageInfo) {
    if (!pendingImageInfo.unlinkURIAfterRemoving) {
      return;
    }
    const path = pathFromURI(pendingImageInfo.uri);
    if (!path) {
      return;
    }
    try {
      await filesystem.unlink(path);
    } catch (e) { }
  }

  get containerStyle() {
    return {
      ...styles.container,
      opacity: this.navigationProgress,
    };
  }

  get focusIndicatorStyle() {
    return {
      ...styles.focusIndicator,
      opacity: this.focusIndicatorOpacity,
      transform: [
        { translateX: this.focusIndicatorX },
        { translateY: this.focusIndicatorY },
        { scale: this.focusIndicatorScale },
      ],
    };
  }

  renderCamera = ({ camera, status }) => {
    if (camera && camera._cameraHandle) {
      this.fetchCameraIDs(camera);
    }
    if (this.state.stagingMode) {
      return this.renderStagingView();
    }
    const topButtonStyle = {
      top: Math.max(this.props.contentVerticalOffset, 6),
    };
    return (
      <>
        {this.renderCameraContent(status)}
        <TouchableOpacity
          onPress={this.close}
          onLayout={this.onCloseButtonLayout}
          style={[ styles.closeButton, topButtonStyle ]}
          ref={this.closeButtonRef}
        >
          <Text style={styles.closeIcon}>×</Text>
        </TouchableOpacity>
      </>
    );
  }

  renderStagingView() {
    let image = null;
    const { pendingImageInfo } = this.state;
    if (pendingImageInfo) {
      const imageSource = { uri: pendingImageInfo.uri };
      image = <Image source={imageSource} style={styles.stagingImage} />;
    } else {
      image = <ContentLoading fillType="flex" colors={colors.dark} />;
    }

    const topButtonStyle = {
      top: Math.max(this.props.contentVerticalOffset - 3, 3),
    };
    return (
      <>
        {image}
        <TouchableOpacity
          onPress={this.clearPendingImage}
          style={[ styles.retakeButton, topButtonStyle ]}
        >
          <Icon name="ios-arrow-back" style={styles.retakeIcon} />
        </TouchableOpacity>
        <SendMediaButton
          onPress={this.sendPhoto}
          pointerEvents={pendingImageInfo ? 'auto' : 'none'}
          containerStyle={styles.sendButtonContainer}
          style={this.sendButtonStyle}
        />
      </>
    );
  }

  renderCameraContent(status) {
    if (status === 'PENDING_AUTHORIZATION') {
      return <ContentLoading fillType="flex" colors={colors.dark} />;
    } else if (status === 'NOT_AUTHORIZED') {
      return (
        <View style={styles.authorizationDeniedContainer}>
          <Text style={styles.authorizationDeniedText}>
            {"don't have permission :("}
          </Text>
        </View>
      );
    }

    let switchCameraButton = null;
    if (this.state.hasCamerasOnBothSides) {
      switchCameraButton = (
        <TouchableOpacity
          onPress={this.switchCamera}
          onLayout={this.onSwitchCameraButtonLayout}
          style={styles.switchCameraButton}
          ref={this.switchCameraButtonRef}
        >
          <Icon
            name="ios-reverse-camera"
            style={styles.switchCameraIcon}
          />
        </TouchableOpacity>
      );
    }

    let flashIcon;
    if (this.state.flashMode === RNCamera.Constants.FlashMode.on) {
      flashIcon = <Icon name="ios-flash" style={styles.flashIcon} />;
    } else if (this.state.flashMode === RNCamera.Constants.FlashMode.off) {
      flashIcon = <Icon name="ios-flash-off" style={styles.flashIcon} />;
    } else {
      flashIcon = (
        <>
          <Icon name="ios-flash" style={styles.flashIcon} />
          <Text style={styles.flashIconAutoText}>A</Text>
        </>
      );
    }

    const topButtonStyle = {
      top: Math.max(this.props.contentVerticalOffset - 3, 3),
    };
    return (
      <PinchGestureHandler
        onGestureEvent={this.pinchEvent}
        onHandlerStateChange={this.pinchEvent}
        simultaneousHandlers={this.tapHandler}
        ref={this.pinchHandler}
      >
        <Animated.View style={styles.fill}>
          <TapGestureHandler
            onHandlerStateChange={this.tapEvent}
            simultaneousHandlers={this.pinchHandler}
            waitFor={this.pinchHandler}
            ref={this.tapHandler}
          >
            <Animated.View style={styles.fill}>
              <Animated.View style={this.focusIndicatorStyle} />
              <TouchableOpacity
                onPress={this.changeFlashMode}
                onLayout={this.onFlashButtonLayout}
                style={[ styles.flashButton, topButtonStyle ]}
                ref={this.flashButtonRef}
              >
                {flashIcon}
              </TouchableOpacity>
              <View style={styles.bottomButtonsContainer}>
                <TouchableOpacity
                  onPress={this.takePhoto}
                  onLayout={this.onPhotoButtonLayout}
                  style={styles.saveButton}
                  ref={this.photoButtonRef}
                >
                  <View style={styles.saveButtonInner} />
                </TouchableOpacity>
                {switchCameraButton}
              </View>
            </Animated.View>
          </TapGestureHandler>
        </Animated.View>
      </PinchGestureHandler>
    );
  }

  render() {
    const statusBar = CameraModal.isActive(this.props)
      ? <ConnectedStatusBar hidden />
      : null;
    const type = this.state.useFrontCamera
      ? RNCamera.Constants.Type.front
      : RNCamera.Constants.Type.back;
    return (
      <Animated.View style={this.containerStyle}>
        {statusBar}
        <Animated.Code exec={this.animationCode} />
        <RNCamera
          type={type}
          captureAudio={false}
          maxZoom={maxZoom}
          zoom={this.state.zoom}
          flashMode={this.state.flashMode}
          autoFocusPointOfInterest={this.state.autoFocusPointOfInterest}
          style={styles.fill}
          androidCameraPermissionOptions={permissionRationale}
          ref={this.cameraRef}
        >
          {this.renderCamera}
        </RNCamera>
        <Animated.View
          style={this.overlayStyle}
          pointerEvents="none"
        />
      </Animated.View>
    );
  }

  cameraRef = (camera: ?RNCamera) => {
    this.camera = camera;
  }

  closeButtonRef = (closeButton: ?TouchableOpacity) => {
    this.closeButton = closeButton;
  }

  onCloseButtonLayout = () => {
    const { closeButton } = this;
    if (!closeButton) {
      return;
    }
    closeButton.measure((x, y, width, height, pageX, pageY) => {
      this.closeButtonX.setValue(pageX);
      this.closeButtonY.setValue(pageY);
      this.closeButtonWidth.setValue(width);
      this.closeButtonHeight.setValue(height);
    });
  }

  photoButtonRef = (photoButton: ?TouchableOpacity) => {
    this.photoButton = photoButton;
  }

  onPhotoButtonLayout = () => {
    const { photoButton } = this;
    if (!photoButton) {
      return;
    }
    photoButton.measure((x, y, width, height, pageX, pageY) => {
      this.photoButtonX.setValue(pageX);
      this.photoButtonY.setValue(pageY);
      this.photoButtonWidth.setValue(width);
      this.photoButtonHeight.setValue(height);
    });
  }

  switchCameraButtonRef = (switchCameraButton: ?TouchableOpacity) => {
    this.switchCameraButton = switchCameraButton;
  }

  onSwitchCameraButtonLayout = () => {
    const { switchCameraButton } = this;
    if (!switchCameraButton) {
      return;
    }
    switchCameraButton.measure((x, y, width, height, pageX, pageY) => {
      this.switchCameraButtonX.setValue(pageX);
      this.switchCameraButtonY.setValue(pageY);
      this.switchCameraButtonWidth.setValue(width);
      this.switchCameraButtonHeight.setValue(height);
    });
  }

  flashButtonRef = (flashButton: ?TouchableOpacity) => {
    this.flashButton = flashButton;
  }

  onFlashButtonLayout = () => {
    const { flashButton } = this;
    if (!flashButton) {
      return;
    }
    flashButton.measure((x, y, width, height, pageX, pageY) => {
      this.flashButtonX.setValue(pageX);
      this.flashButtonY.setValue(pageY);
      this.flashButtonWidth.setValue(width);
      this.flashButtonHeight.setValue(height);
    });
  }

  close = () => {
    this.props.navigation.goBack();
  }

  takePhoto = async () => {
    const { camera } = this;
    invariant(camera, "camera ref should be set");
    this.setState({ stagingMode: true });

    // We avoid flipping this.state.useFrontCamera if we discover we don't
    // actually have a back camera since it causes a bit of lag, but this
    // means there are cases where it is false but we are actually using the
    // front camera
    const {
      hasCamerasOnBothSides,
      defaultUseFrontCamera,
    } = this.props.deviceCameraInfo;
    const usingFrontCamera = this.state.useFrontCamera ||
      (!hasCamerasOnBothSides && defaultUseFrontCamera);

    const photoPromise = camera.takePictureAsync({
      pauseAfterCapture: Platform.OS === "android",
      mirrorImage: usingFrontCamera,
      fixOrientation: true,
    });

    if (Platform.OS === "ios") {
      camera.pausePreview();
    }
    const { uri, width, height } = await photoPromise;
    const filename = filenameFromPathOrURI(uri);
    invariant(
      filename,
      `unable to parse filename out of react-native-camera URI ${uri}`,
    );

    const pendingImageInfo = {
      uri,
      filename,
      width,
      height,
      type: "photo",
      unlinkURIAfterRemoving: true,
    };

    this.setState({
      pendingImageInfo,
      zoom: 0,
      autoFocusPointOfInterest: undefined,
    });
  }

  sendPhoto = async () => {
    const { pendingImageInfo } = this.state;
    if (!pendingImageInfo) {
      return;
    }
    const { chatInputState } = this.props;
    invariant(chatInputState, "chatInputState should be set");
    this.close();
    chatInputState.sendMultimediaMessage(
      this.props.navigation.state.params.threadID,
      [ pendingImageInfo ],
    );
    saveImage({ uri: pendingImageInfo.uri, type: "photo" });
  }

  clearPendingImage = () => {
    invariant(this.camera, "camera ref should be set");
    this.camera.resumePreview();
    this.setState({
      stagingMode: false,
      pendingImageInfo: undefined,
    });
  }

  switchCamera = () => {
    this.setState((prevState: State) => ({
      useFrontCamera: !prevState.useFrontCamera,
    }));
  }

  updateZoom = ([ zoom ]: [ number ]) => {
    this.setState({ zoom });
  }

  changeFlashMode = () => {
    if (this.state.flashMode === RNCamera.Constants.FlashMode.on) {
      this.setState({ flashMode: RNCamera.Constants.FlashMode.off });
    } else if (this.state.flashMode === RNCamera.Constants.FlashMode.off) {
      this.setState({ flashMode: RNCamera.Constants.FlashMode.auto });
    } else {
      this.setState({ flashMode: RNCamera.Constants.FlashMode.on });
    }
  }

  focusOnPoint = ([ inputX, inputY ]: [ number, number ]) => {
    const screenWidth = this.props.screenDimensions.width;
    const screenHeight =
      this.props.screenDimensions.height + contentBottomOffset;
    const relativeX = inputX / screenWidth;
    const relativeY = inputY / screenHeight;

    // react-native-camera's autoFocusPointOfInterest prop is based on a
    // LANDSCAPE-LEFT orientation, so we need to map to that
    let x, y;
    if (this.props.deviceOrientation === 'LANDSCAPE-LEFT') {
      x = relativeX;
      y = relativeY;
    } else if (this.props.deviceOrientation === 'LANDSCAPE-RIGHT') {
      x = 1 - relativeX;
      y = 1 - relativeY;
    } else if (this.props.deviceOrientation === 'PORTRAIT-UPSIDEDOWN') {
      x = 1 - relativeY;
      y = relativeX;
    } else {
      x = relativeY;
      y = 1 - relativeX;
    }

    const autoFocusPointOfInterest = Platform.OS === "ios"
      ? { x, y, autoExposure: true }
      : { x, y };
    this.setState({ autoFocusPointOfInterest });
  }

  fetchCameraIDs = async (camera: RNCamera) => {
    if (this.cameraIDsFetched) {
      return;
    }
    this.cameraIDsFetched = true;

    const deviceCameras = await camera.getCameraIdsAsync();

    let hasFront = false, hasBack = false, i = 0;
    while ((!hasFront || !hasBack) && i < deviceCameras.length) {
      const deviceCamera = deviceCameras[i];
      if (deviceCamera.type === RNCamera.Constants.Type.front) {
        hasFront = true;
      } else if (deviceCamera.type === RNCamera.Constants.Type.back) {
        hasBack = true;
      }
      i++;
    }

    const hasCamerasOnBothSides = hasFront && hasBack;
    const defaultUseFrontCamera = !hasBack && hasFront;
    if (hasCamerasOnBothSides !== this.state.hasCamerasOnBothSides) {
      this.setState({ hasCamerasOnBothSides });
    }
    const {
      hasCamerasOnBothSides: oldHasCamerasOnBothSides,
      defaultUseFrontCamera: oldDefaultUseFrontCamera,
    } = this.props.deviceCameraInfo;
    if (
      hasCamerasOnBothSides !== oldHasCamerasOnBothSides ||
      defaultUseFrontCamera !== oldDefaultUseFrontCamera
    ) {
      this.props.dispatchActionPayload(
        updateDeviceCameraInfoActionType,
        { hasCamerasOnBothSides, defaultUseFrontCamera },
      );
    }
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  fill: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    paddingBottom: 2,
    paddingHorizontal: 8,
  },
  closeIcon: {
    fontSize: 36,
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  bottomButtonsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: contentBottomOffset + 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    height: 75,
    width: 75,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonInner: {
    height: 60,
    width: 60,
    borderRadius: 60,
    backgroundColor: '#FFFFFF88',
  },
  switchCameraButton: {
    position: 'absolute',
    right: 18,
    paddingVertical: 2,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  switchCameraIcon: {
    color: 'white',
    fontSize: 36,
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  flashButton: {
    position: 'absolute',
    right: 15,
    marginTop: Platform.select({ android: 15, default: 13 }),
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  flashIcon: {
    fontSize: 24,
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  flashIconAutoText: {
    position: 'absolute',
    top: 0,
    right: 5,
    fontSize: 10,
    fontWeight: 'bold',
    color: "white",
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  retakeButton: {
    position: 'absolute',
    left: 20,
    marginTop: Platform.select({ android: 15, default: 15 }),
    paddingBottom: 3,
    paddingHorizontal: 10,
  },
  retakeIcon: {
    fontSize: 24,
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  authorizationDeniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorizationDeniedText: {
    color: colors.dark.listSeparatorLabel,
    fontSize: 28,
    textAlign: 'center',
  },
  focusIndicator: {
    position: 'absolute',
    left: -12,
    top: -12,
    height: 24,
    width: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'white',
  },
  sendButtonContainer: {
    position: 'absolute',
    right: 32,
    bottom: contentBottomOffset + 22,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
  },
  stagingImage: {
    flex: 1,
    backgroundColor: 'black',
    resizeMode: "contain",
  },
});

export default connect(
  (state: AppState) => ({
    screenDimensions: dimensionsSelector(state),
    contentVerticalOffset: contentVerticalOffsetSelector(state),
    deviceCameraInfo: state.deviceCameraInfo,
    deviceOrientation: state.deviceOrientation,
    foreground: state.foreground,
  }),
  null,
  true,
)(withChatInputState(CameraModal));
