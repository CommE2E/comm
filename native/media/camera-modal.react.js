// @flow

import Icon from '@expo/vector-icons/Ionicons.js';
import invariant from 'invariant';
import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import filesystem from 'react-native-fs';
import {
  PinchGestureHandler,
  TapGestureHandler,
  State as GestureState,
  type PinchGestureEvent,
  type TapGestureEvent,
} from 'react-native-gesture-handler';
import Orientation from 'react-native-orientation-locker';
import type { Orientations } from 'react-native-orientation-locker';
import Reanimated, {
  EasingNode as ReanimatedEasing,
  type EventResult,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { pathFromURI, filenameFromPathOrURI } from 'lib/media/file-utils.js';
import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils.js';
import type { PhotoCapture } from 'lib/types/media-types.js';
import type { ReactRef } from 'lib/types/react-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import SendMediaButton from './send-media-button.react.js';
import type { AuthNavigationProp } from '../account/registration/auth-navigator.react.js';
import ContentLoading from '../components/content-loading.react.js';
import ConnectedStatusBar from '../connected-status-bar.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context.js';
import { updateDeviceCameraInfoActionType } from '../redux/action-types.js';
import { type DimensionsInfo } from '../redux/dimensions-updater.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { colors } from '../themes/colors.js';
import { type DeviceCameraInfo } from '../types/camera.js';
import type { NativeMethods } from '../types/react-native.js';
import {
  AnimatedView,
  type ViewStyle,
  type AnimatedViewStyle,
} from '../types/styles.js';
import { clamp, gestureJustEnded } from '../utils/animation-utils.js';

const {
  Value,
  Node,
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
  interpolateNode,
  startClock,
  stopClock,
  clockRunning,
  timing,
  spring,
  SpringUtils,
} = Reanimated;

const maxZoom = 16;
const zoomUpdateFactor = (() => {
  if (Platform.OS === 'ios') {
    return 0.002;
  }
  if (Platform.OS === 'android' && Platform.Version > 26) {
    return 0.005;
  }
  if (Platform.OS === 'android' && Platform.Version > 23) {
    return 0.01;
  }
  return 0.03;
})();

const stagingModeAnimationConfig = {
  duration: 150,
  easing: ReanimatedEasing.inOut(ReanimatedEasing.ease),
};
const sendButtonAnimationConfig = {
  duration: 150,
  easing: Easing.inOut(Easing.ease),
  useNativeDriver: true,
};

const indicatorSpringConfig = {
  ...SpringUtils.makeDefaultConfig(),
  damping: 0,
  mass: 0.6,
  toValue: 1,
};
const indicatorTimingConfig = {
  duration: 500,
  easing: ReanimatedEasing.out(ReanimatedEasing.ease),
  toValue: 0,
};
function runIndicatorAnimation(
  // Inputs
  springClock: Clock,
  delayClock: Clock,
  timingClock: Clock,
  animationRunning: Node,
  // Outputs
  scale: Value,
  opacity: Value,
): Node {
  const delayStart = new Value(0);

  const springScale = new Value(0.75);
  const delayScale = new Value(0);
  const timingScale = new Value(0.75);

  const animatedScale = cond(
    clockRunning(springClock),
    springScale,
    cond(clockRunning(delayClock), delayScale, timingScale),
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
    cond(not(animationRunning), [
      set(springState.finished, 0),
      set(springState.velocity, 0),
      set(springState.time, 0),
      set(springScale, 0.75),
      set(lastAnimatedScale, 0.75),
      set(numScaleLoops, 0),
      set(opacity, 1),
      startClock(springClock),
    ]),
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
          cond(greaterThan(numScaleLoops, 1), [
            set(springState.finished, 1),
            stopClock(springClock),
            set(delayScale, springScale),
            set(delayStart, delayClock),
            startClock(delayClock),
          ]),
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
    cond(clockRunning(timingClock), set(opacity, clamp(animatedScale, 0, 1))),
  ]);
}

async function cleanUpPendingPhotoCapture(pendingPhotoCapture: PhotoCapture) {
  const path = pathFromURI(pendingPhotoCapture.uri);
  if (!path) {
    return;
  }
  try {
    await filesystem.unlink(path);
  } catch (e) {}
}

type RNCameraStatus = 'READY' | 'PENDING_AUTHORIZATION' | 'NOT_AUTHORIZED';

type TouchableOpacityInstance = React.AbstractComponent<
  React.ElementConfig<typeof TouchableOpacity>,
  NativeMethods,
>;

type BaseProps = {
  +handlePhotoCapture: (capture: PhotoCapture) => mixed,
  +navigation:
    | AppNavigationProp<'ChatCameraModal'>
    | AppNavigationProp<'UserAvatarCameraModal'>
    | AppNavigationProp<'ThreadAvatarCameraModal'>
    | AuthNavigationProp<'RegistrationUserAvatarCameraModal'>,
};
type Props = {
  ...BaseProps,
  // Redux state
  +dimensions: DimensionsInfo,
  +deviceCameraInfo: DeviceCameraInfo,
  +deviceOrientation: Orientations,
  +foreground: boolean,
  // Redux dispatch functions
  +dispatch: Dispatch,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  +isActive: boolean,
  +flashMode: number,
  +changeFlashMode: () => void,
  +useFrontCamera: boolean,
  +switchCamera: () => void,
  +hasCamerasOnBothSides: boolean,
  +fetchCameraIDs: (camera: RNCamera) => Promise<void>,
  +autoFocusPointOfInterest: ?{
    x: number,
    y: number,
    autoExposure?: boolean,
  },
  +setAutoFocusPointOfInterest: (
    ?{
      x: number,
      y: number,
      autoExposure?: boolean,
    },
  ) => void,
  +focusOnPoint: (input: [number, number]) => void,
  +zoom: number,
  +setZoom: (zoom: number) => void,
  +updateZoom: (zoom: [number]) => void,
  +stagingMode: boolean,
  +setStagingMode: (stagingMode: boolean) => void,
  +pendingPhotoCapture: ?PhotoCapture,
  +setPendingPhotoCapture: (?PhotoCapture) => void,
  +camera: { current: ?RNCamera },
  +takePhoto: () => Promise<void>,
  +close: () => void,
  +sendPhoto: () => Promise<void>,
  +clearPendingImage: () => void,
};

class CameraModal extends React.PureComponent<Props> {
  pinchEvent: EventResult<PinchGestureEvent>;
  pinchHandler: ReactRef<PinchGestureHandler> = React.createRef();
  tapEvent: EventResult<TapGestureEvent>;
  tapHandler: ReactRef<TapGestureHandler> = React.createRef();
  animationCode: Node;

  closeButton: ?React.ElementRef<TouchableOpacityInstance>;
  closeButtonX: Value = new Value(-1);
  closeButtonY: Value = new Value(-1);
  closeButtonWidth: Value = new Value(0);
  closeButtonHeight: Value = new Value(0);

  photoButton: ?React.ElementRef<TouchableOpacityInstance>;
  photoButtonX: Value = new Value(-1);
  photoButtonY: Value = new Value(-1);
  photoButtonWidth: Value = new Value(0);
  photoButtonHeight: Value = new Value(0);

  switchCameraButton: ?React.ElementRef<TouchableOpacityInstance>;
  switchCameraButtonX: Value = new Value(-1);
  switchCameraButtonY: Value = new Value(-1);
  switchCameraButtonWidth: Value = new Value(0);
  switchCameraButtonHeight: Value = new Value(0);

  flashButton: ?React.ElementRef<TouchableOpacityInstance>;
  flashButtonX: Value = new Value(-1);
  flashButtonY: Value = new Value(-1);
  flashButtonWidth: Value = new Value(0);
  flashButtonHeight: Value = new Value(0);

  focusIndicatorX: Value = new Value(-1);
  focusIndicatorY: Value = new Value(-1);
  focusIndicatorScale: Value = new Value(0);
  focusIndicatorOpacity: Value = new Value(0);

  cancelIndicatorAnimation: Value = new Value(0);

  stagingModeProgress: Value = new Value(0);
  sendButtonProgress: Animated.Value = new Animated.Value(0);
  sendButtonStyle: ViewStyle;
  overlayStyle: AnimatedViewStyle;

  constructor(props: Props) {
    super(props);

    const sendButtonScale = this.sendButtonProgress.interpolate({
      inputRange: [0, 1],
      outputRange: ([1.1, 1]: number[]), // Flow...
    });
    this.sendButtonStyle = {
      opacity: this.sendButtonProgress,
      transform: [{ scale: sendButtonScale }],
    };

    const overlayOpacity = interpolateNode(this.stagingModeProgress, {
      inputRange: [0, 0.01, 1],
      outputRange: [0, 0.5, 0],
      extrapolate: Extrapolate.CLAMP,
    });
    this.overlayStyle = {
      ...styles.overlay,
      opacity: overlayOpacity,
    };

    const pinchState = new Value(-1);
    const pinchScale = new Value(1);
    this.pinchEvent = event([
      {
        nativeEvent: {
          state: pinchState,
          scale: pinchScale,
        },
      },
    ]);

    const tapState = new Value(-1);
    const tapX = new Value(0);
    const tapY = new Value(0);
    this.tapEvent = event([
      {
        nativeEvent: {
          state: tapState,
          x: tapX,
          y: tapY,
        },
      },
    ]);

    this.animationCode = block([
      this.zoomAnimationCode(pinchState, pinchScale),
      this.focusAnimationCode(tapState, tapX, tapY),
    ]);
  }

  zoomAnimationCode(pinchState: Node, pinchScale: Node): Node {
    const pinchJustEnded = gestureJustEnded(pinchState);

    const zoomBase = new Value(1);
    const zoomReported = new Value(1);

    const currentZoom = interpolateNode(multiply(zoomBase, pinchScale), {
      inputRange: [1, 8],
      outputRange: [1, 8],
      extrapolate: Extrapolate.CLAMP,
    });
    const cameraZoomFactor = interpolateNode(zoomReported, {
      inputRange: [1, 8],
      outputRange: [0, 1],
      extrapolate: Extrapolate.CLAMP,
    });
    const resolvedZoom = cond(
      eq(pinchState, GestureState.ACTIVE),
      currentZoom,
      zoomBase,
    );

    return block([
      cond(pinchJustEnded, set(zoomBase, currentZoom)),
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
          call([cameraZoomFactor], this.props.updateZoom),
        ],
      ),
    ]);
  }

  focusAnimationCode(tapState: Node, tapX: Node, tapY: Node): Node {
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

    return block([
      cond(fingerJustReleased, [
        call([tapX, tapY], this.props.focusOnPoint),
        set(this.focusIndicatorX, tapX),
        set(this.focusIndicatorY, tapY),
        stopClock(indicatorSpringClock),
        stopClock(indicatorDelayClock),
        stopClock(indicatorTimingClock),
      ]),
      cond(this.cancelIndicatorAnimation, [
        set(this.cancelIndicatorAnimation, 0),
        stopClock(indicatorSpringClock),
        stopClock(indicatorDelayClock),
        stopClock(indicatorTimingClock),
        set(this.focusIndicatorOpacity, 0),
      ]),
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
    ]);
  }

  outsideButtons(x: Node, y: Node): Node {
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

  componentDidUpdate(prevProps: Props) {
    if (!this.props.hasCamerasOnBothSides && prevProps.hasCamerasOnBothSides) {
      this.switchCameraButtonX.setValue(-1);
      this.switchCameraButtonY.setValue(-1);
      this.switchCameraButtonWidth.setValue(0);
      this.switchCameraButtonHeight.setValue(0);
    }

    if (this.props.deviceOrientation !== prevProps.deviceOrientation) {
      this.props.setAutoFocusPointOfInterest(null);
      this.cancelIndicatorAnimation.setValue(1);
    }

    if (
      this.props.foreground &&
      !prevProps.foreground &&
      this.props.camera.current
    ) {
      void this.props.camera.current.refreshAuthorizationStatus();
    }

    if (this.props.stagingMode && !prevProps.stagingMode) {
      this.cancelIndicatorAnimation.setValue(1);
      this.focusIndicatorOpacity.setValue(0);
      timing(this.stagingModeProgress, {
        ...stagingModeAnimationConfig,
        toValue: 1,
      }).start();
    } else if (!this.props.stagingMode && prevProps.stagingMode) {
      this.stagingModeProgress.setValue(0);
    }

    if (this.props.pendingPhotoCapture && !prevProps.pendingPhotoCapture) {
      Animated.timing(this.sendButtonProgress, {
        ...sendButtonAnimationConfig,
        toValue: 1,
      }).start();
    } else if (
      !this.props.pendingPhotoCapture &&
      prevProps.pendingPhotoCapture
    ) {
      void cleanUpPendingPhotoCapture(prevProps.pendingPhotoCapture);
      this.sendButtonProgress.setValue(0);
    }
  }

  get containerStyle(): AnimatedViewStyle {
    const { overlayContext } = this.props;
    if (!overlayContext) {
      return styles.container;
    }
    return {
      ...styles.container,
      opacity: overlayContext.position,
    };
  }

  get focusIndicatorStyle(): AnimatedViewStyle {
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

  renderCamera = ({
    camera,
    status,
  }: {
    +camera: RNCamera & { +_cameraHandle?: mixed, ... },
    status: RNCameraStatus,
    ...
  }): React.Node => {
    if (camera && camera._cameraHandle) {
      void this.props.fetchCameraIDs(camera);
    }
    if (this.props.stagingMode) {
      return this.renderStagingView();
    }

    return (
      <SafeAreaView style={styles.fill}>
        <View style={styles.fill}>
          {this.renderCameraContent(status)}
          <TouchableOpacity
            onPress={this.props.close}
            onLayout={this.onCloseButtonLayout}
            style={styles.closeButton}
            ref={this.closeButtonRef}
          >
            <Text style={styles.closeIcon}>×</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

  renderStagingView(): React.Node {
    let image = null;
    const { pendingPhotoCapture } = this.props;
    if (pendingPhotoCapture) {
      const imageSource = { uri: pendingPhotoCapture.uri };
      image = <Image source={imageSource} style={styles.stagingImage} />;
    } else {
      image = <ContentLoading fillType="flex" colors={colors.dark} />;
    }

    return (
      <>
        {image}
        <SafeAreaView style={styles.stagingViewOverlay}>
          <View style={styles.fill}>
            <TouchableOpacity
              onPress={this.props.clearPendingImage}
              style={styles.retakeButton}
            >
              <Icon name="ios-arrow-back" style={styles.retakeIcon} />
            </TouchableOpacity>
            <SendMediaButton
              onPress={this.props.sendPhoto}
              pointerEvents={pendingPhotoCapture ? 'auto' : 'none'}
              containerStyle={styles.sendButtonContainer}
              style={this.sendButtonStyle}
            />
          </View>
        </SafeAreaView>
      </>
    );
  }

  renderCameraContent(status: RNCameraStatus): React.Node {
    if (status === 'PENDING_AUTHORIZATION') {
      return <ContentLoading fillType="flex" colors={colors.dark} />;
    } else if (status === 'NOT_AUTHORIZED') {
      return (
        <View style={styles.authorizationDeniedContainer}>
          <Text style={styles.authorizationDeniedText}>
            {'don’t have permission :('}
          </Text>
        </View>
      );
    }

    let switchCameraButton = null;
    if (this.props.hasCamerasOnBothSides) {
      switchCameraButton = (
        <TouchableOpacity
          onPress={this.props.switchCamera}
          onLayout={this.onSwitchCameraButtonLayout}
          style={styles.switchCameraButton}
          ref={this.switchCameraButtonRef}
        >
          <Icon name="ios-camera-reverse" style={styles.switchCameraIcon} />
        </TouchableOpacity>
      );
    }

    let flashIcon;
    if (this.props.flashMode === RNCamera.Constants.FlashMode.on) {
      flashIcon = <Icon name="ios-flash" style={styles.flashIcon} />;
    } else if (this.props.flashMode === RNCamera.Constants.FlashMode.off) {
      flashIcon = <Icon name="ios-flash-off" style={styles.flashIcon} />;
    } else {
      flashIcon = (
        <>
          <Icon name="ios-flash" style={styles.flashIcon} />
          <Text style={styles.flashIconAutoText}>A</Text>
        </>
      );
    }

    return (
      <PinchGestureHandler
        onGestureEvent={this.pinchEvent}
        onHandlerStateChange={this.pinchEvent}
        simultaneousHandlers={this.tapHandler}
        ref={this.pinchHandler}
      >
        <Reanimated.View style={styles.fill}>
          <TapGestureHandler
            onHandlerStateChange={this.tapEvent}
            simultaneousHandlers={this.pinchHandler}
            waitFor={this.pinchHandler}
            ref={this.tapHandler}
          >
            <Reanimated.View style={styles.fill}>
              <Reanimated.View style={this.focusIndicatorStyle} />
              <TouchableOpacity
                onPress={this.props.changeFlashMode}
                onLayout={this.onFlashButtonLayout}
                style={styles.flashButton}
                ref={this.flashButtonRef}
              >
                {flashIcon}
              </TouchableOpacity>
              <View style={styles.bottomButtonsContainer}>
                <TouchableOpacity
                  onPress={this.props.takePhoto}
                  onLayout={this.onPhotoButtonLayout}
                  style={styles.saveButton}
                  ref={this.photoButtonRef}
                >
                  <View style={styles.saveButtonInner} />
                </TouchableOpacity>
                {switchCameraButton}
              </View>
            </Reanimated.View>
          </TapGestureHandler>
        </Reanimated.View>
      </PinchGestureHandler>
    );
  }

  render(): React.Node {
    const statusBar = this.props.isActive ? (
      <ConnectedStatusBar hidden />
    ) : null;
    const type = this.props.useFrontCamera
      ? RNCamera.Constants.Type.front
      : RNCamera.Constants.Type.back;
    return (
      <Reanimated.View style={this.containerStyle}>
        {statusBar}
        <Reanimated.Code exec={this.animationCode} />
        <RNCamera
          type={type}
          captureAudio={false}
          maxZoom={maxZoom}
          zoom={this.props.zoom}
          flashMode={this.props.flashMode}
          autoFocusPointOfInterest={this.props.autoFocusPointOfInterest}
          style={styles.fill}
          androidCameraPermissionOptions={null}
          ref={this.props.camera}
        >
          {this.renderCamera}
        </RNCamera>
        <AnimatedView style={this.overlayStyle} pointerEvents="none" />
      </Reanimated.View>
    );
  }

  closeButtonRef = (
    closeButton: ?React.ElementRef<typeof TouchableOpacity>,
  ) => {
    this.closeButton = (closeButton: any);
  };

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
  };

  photoButtonRef = (
    photoButton: ?React.ElementRef<typeof TouchableOpacity>,
  ) => {
    this.photoButton = (photoButton: any);
  };

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
  };

  switchCameraButtonRef = (
    switchCameraButton: ?React.ElementRef<typeof TouchableOpacity>,
  ) => {
    this.switchCameraButton = (switchCameraButton: any);
  };

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
  };

  flashButtonRef = (
    flashButton: ?React.ElementRef<typeof TouchableOpacity>,
  ) => {
    this.flashButton = (flashButton: any);
  };

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
  };
}

const styles = StyleSheet.create({
  authorizationDeniedContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  authorizationDeniedText: {
    color: colors.dark.listSeparatorLabel,
    fontSize: 28,
    textAlign: 'center',
  },
  bottomButtonsContainer: {
    alignItems: 'center',
    bottom: 20,
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  closeButton: {
    left: 16,
    paddingBottom: 2,
    paddingHorizontal: 8,
    position: 'absolute',
    top: 6,
  },
  closeIcon: {
    color: 'white',
    fontSize: 36,
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  container: {
    backgroundColor: 'black',
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  flashButton: {
    marginTop: (Platform.select({ android: 15, default: 13 }): number),
    paddingHorizontal: 10,
    paddingVertical: 3,
    position: 'absolute',
    right: 15,
    top: 3,
  },
  flashIcon: {
    color: 'white',
    fontSize: 24,
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  flashIconAutoText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    position: 'absolute',
    right: 5,
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    top: 0,
  },
  focusIndicator: {
    borderColor: 'white',
    borderRadius: 24,
    borderWidth: 1,
    height: 24,
    left: -12,
    position: 'absolute',
    top: -12,
    width: 24,
  },
  overlay: {
    backgroundColor: 'white',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  retakeButton: {
    left: 20,
    marginTop: (Platform.select({ android: 15, default: 15 }): number),
    paddingBottom: 3,
    paddingHorizontal: 10,
    position: 'absolute',
    top: 6,
  },
  retakeIcon: {
    color: 'white',
    fontSize: 24,
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  saveButton: {
    alignItems: 'center',
    borderColor: 'white',
    borderRadius: 75,
    borderWidth: 4,
    height: 75,
    justifyContent: 'center',
    width: 75,
  },
  saveButtonInner: {
    backgroundColor: '#FFFFFF88',
    borderRadius: 60,
    height: 60,
    width: 60,
  },
  sendButtonContainer: {
    bottom: 22,
    position: 'absolute',
    right: 32,
  },
  stagingImage: {
    backgroundColor: 'black',
    flex: 1,
    resizeMode: 'contain',
  },
  stagingViewOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  switchCameraButton: {
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: 'absolute',
    right: 18,
  },
  switchCameraIcon: {
    color: 'white',
    fontSize: 36,
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

const ConnectedCameraModal: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedCameraModal(props: BaseProps) {
    const dimensions = useSelector(state => state.dimensions);
    const deviceCameraInfo = useSelector(state => state.deviceCameraInfo);
    const deviceOrientation = useSelector(state => state.deviceOrientation);
    const foreground = useIsAppForegrounded();
    const overlayContext = React.useContext(OverlayContext);
    const dispatch = useDispatch();

    const { navigation, handlePhotoCapture } = props;

    const isActive = !overlayContext || !overlayContext.isDismissing;

    React.useEffect(() => {
      if (isActive) {
        Orientation.unlockAllOrientations();
      } else {
        Orientation.lockToPortrait();
      }
    }, [isActive]);

    const [flashMode, setFlashMode] = React.useState(
      RNCamera.Constants.FlashMode.off,
    );

    const changeFlashMode = React.useCallback(() => {
      if (flashMode === RNCamera.Constants.FlashMode.on) {
        setFlashMode(RNCamera.Constants.FlashMode.off);
      } else if (flashMode === RNCamera.Constants.FlashMode.off) {
        setFlashMode(RNCamera.Constants.FlashMode.auto);
      } else {
        setFlashMode(RNCamera.Constants.FlashMode.on);
      }
    }, [flashMode]);

    const [useFrontCamera, setUseFrontCamera] = React.useState(
      deviceCameraInfo.defaultUseFrontCamera,
    );

    const switchCamera = React.useCallback(() => {
      setUseFrontCamera(prevUseFrontCamera => !prevUseFrontCamera);
    }, []);

    const [hasCamerasOnBothSides, setHasCamerasOnBothSides] = React.useState(
      deviceCameraInfo.hasCamerasOnBothSides,
    );

    const cameraIDsFetched = React.useRef(false);

    const fetchCameraIDs = React.useCallback(
      async (camera: RNCamera) => {
        if (cameraIDsFetched.current) {
          return;
        }
        cameraIDsFetched.current = true;

        const deviceCameras = await camera.getCameraIdsAsync();

        let hasFront = false,
          hasBack = false,
          i = 0;
        while ((!hasFront || !hasBack) && i < deviceCameras.length) {
          const deviceCamera = deviceCameras[i];
          if (deviceCamera.type === RNCamera.Constants.Type.front) {
            hasFront = true;
          } else if (deviceCamera.type === RNCamera.Constants.Type.back) {
            hasBack = true;
          }
          i++;
        }

        const nextHasCamerasOnBothSides = hasFront && hasBack;
        const defaultUseFrontCamera = !hasBack && hasFront;
        if (nextHasCamerasOnBothSides !== hasCamerasOnBothSides) {
          setHasCamerasOnBothSides(nextHasCamerasOnBothSides);
        }
        const {
          hasCamerasOnBothSides: oldHasCamerasOnBothSides,
          defaultUseFrontCamera: oldDefaultUseFrontCamera,
        } = deviceCameraInfo;
        if (
          nextHasCamerasOnBothSides !== oldHasCamerasOnBothSides ||
          defaultUseFrontCamera !== oldDefaultUseFrontCamera
        ) {
          dispatch({
            type: updateDeviceCameraInfoActionType,
            payload: {
              hasCamerasOnBothSides: nextHasCamerasOnBothSides,
              defaultUseFrontCamera,
            },
          });
        }
      },
      [deviceCameraInfo, dispatch, hasCamerasOnBothSides],
    );

    const [autoFocusPointOfInterest, setAutoFocusPointOfInterest] =
      React.useState<?{
        x: number,
        y: number,
        autoExposure?: boolean,
      }>();

    const focusOnPoint = React.useCallback(
      ([inputX, inputY]: [number, number]) => {
        const { width: screenWidth, height: screenHeight } = dimensions;
        const relativeX = inputX / screenWidth;
        const relativeY = inputY / screenHeight;

        // react-native-camera's autoFocusPointOfInterest prop is based on a
        // LANDSCAPE-LEFT orientation, so we need to map to that
        let x, y;
        if (deviceOrientation === 'LANDSCAPE-LEFT') {
          x = relativeX;
          y = relativeY;
        } else if (deviceOrientation === 'LANDSCAPE-RIGHT') {
          x = 1 - relativeX;
          y = 1 - relativeY;
        } else if (deviceOrientation === 'PORTRAIT-UPSIDEDOWN') {
          x = 1 - relativeY;
          y = relativeX;
        } else {
          x = relativeY;
          y = 1 - relativeX;
        }
        setAutoFocusPointOfInterest(
          Platform.OS === 'ios' ? { x, y, autoExposure: true } : { x, y },
        );
      },
      [deviceOrientation, dimensions],
    );

    const [zoom, setZoom] = React.useState(0);

    const updateZoom = React.useCallback(([nextZoom]: [number]) => {
      setZoom(nextZoom);
    }, []);

    const [stagingMode, setStagingMode] = React.useState(false);
    const [pendingPhotoCapture, setPendingPhotoCapture] =
      React.useState<?PhotoCapture>();

    const cameraRef = React.useRef<?RNCamera>();

    const takePhoto = React.useCallback(async () => {
      const camera = cameraRef.current;
      invariant(camera, 'camera ref should be set');
      setStagingMode(true);

      // We avoid flipping useFrontCamera if we discover we don't
      // actually have a back camera since it causes a bit of lag, but this
      // means there are cases where it is false but we are actually using the
      // front camera
      const {
        hasCamerasOnBothSides: hasCamerasOnBothSidesFromDeviceInfo,
        defaultUseFrontCamera,
      } = deviceCameraInfo;
      const usingFrontCamera =
        useFrontCamera ||
        (!hasCamerasOnBothSidesFromDeviceInfo && defaultUseFrontCamera);

      const startTime = Date.now();
      const photoPromise = camera.takePictureAsync({
        pauseAfterCapture: Platform.OS === 'android',
        mirrorImage: usingFrontCamera,
        fixOrientation: true,
      });

      if (Platform.OS === 'ios') {
        camera.pausePreview();
      }
      const { uri, width, height } = await photoPromise;
      const filename = filenameFromPathOrURI(uri);
      invariant(
        filename,
        `unable to parse filename out of react-native-camera URI ${uri}`,
      );

      const now = Date.now();
      const nextPendingPhotoCapture = {
        step: 'photo_capture',
        uri,
        dimensions: { width, height },
        filename,
        time: now - startTime,
        captureTime: now,
        selectTime: 0,
        sendTime: 0,
        retries: 0,
      };

      setAutoFocusPointOfInterest(undefined);
      setZoom(0);
      setPendingPhotoCapture(nextPendingPhotoCapture);
    }, [deviceCameraInfo, useFrontCamera]);

    const close = React.useCallback(() => {
      if (overlayContext && navigation.goBackOnce) {
        navigation.goBackOnce();
      } else {
        navigation.goBack();
      }
    }, [navigation, overlayContext]);

    const sendPhoto = React.useCallback(async () => {
      if (!pendingPhotoCapture) {
        return;
      }

      const now = Date.now();
      const capture = {
        ...pendingPhotoCapture,
        selectTime: now,
        sendTime: now,
      };

      close();
      handlePhotoCapture(capture);
    }, [close, handlePhotoCapture, pendingPhotoCapture]);

    const clearPendingImage = React.useCallback(() => {
      invariant(cameraRef.current, 'camera ref should be set');
      cameraRef.current.resumePreview();
      setStagingMode(false);
      setPendingPhotoCapture();
    }, []);

    return (
      <CameraModal
        {...props}
        dimensions={dimensions}
        deviceCameraInfo={deviceCameraInfo}
        deviceOrientation={deviceOrientation}
        foreground={foreground}
        dispatch={dispatch}
        overlayContext={overlayContext}
        isActive={isActive}
        flashMode={flashMode}
        changeFlashMode={changeFlashMode}
        useFrontCamera={useFrontCamera}
        switchCamera={switchCamera}
        hasCamerasOnBothSides={hasCamerasOnBothSides}
        fetchCameraIDs={fetchCameraIDs}
        autoFocusPointOfInterest={autoFocusPointOfInterest}
        setAutoFocusPointOfInterest={setAutoFocusPointOfInterest}
        focusOnPoint={focusOnPoint}
        zoom={zoom}
        setZoom={setZoom}
        updateZoom={updateZoom}
        stagingMode={stagingMode}
        setStagingMode={setStagingMode}
        pendingPhotoCapture={pendingPhotoCapture}
        setPendingPhotoCapture={setPendingPhotoCapture}
        camera={cameraRef}
        takePhoto={takePhoto}
        close={close}
        sendPhoto={sendPhoto}
        clearPendingImage={clearPendingImage}
      />
    );
  });

export default ConnectedCameraModal;
