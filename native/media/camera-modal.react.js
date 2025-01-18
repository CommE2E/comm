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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Orientation from 'react-native-orientation-locker';
import type { Orientations } from 'react-native-orientation-locker';
import Reanimated, {
  Easing as ReanimatedEasing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  cancelAnimation,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { pathFromURI, filenameFromPathOrURI } from 'lib/media/file-utils.js';
import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils.js';
import type { PhotoCapture } from 'lib/types/media-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import SendMediaButton from './send-media-button.react.js';
import type { AuthNavigationProp } from '../account/registration/auth-navigator.react.js';
import ContentLoading from '../components/content-loading.react.js';
import ConnectedStatusBar from '../connected-status-bar.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import { updateDeviceCameraInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { colors } from '../themes/colors.js';
import type { NativeMethods } from '../types/react-native.js';
import { clampV2 } from '../utils/animation-utils.js';

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
  damping: 0,
  mass: 0.6,
};
const indicatorTimingConfig = {
  duration: 500,
  easing: ReanimatedEasing.out(ReanimatedEasing.ease),
};

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

type AutoFocusPointOfInterest = ?{
  x: number,
  y: number,
  autoExposure?: boolean,
};

type Dimensions = {
  x: number,
  y: number,
  width: number,
  height: number,
};

type Props = {
  +handlePhotoCapture: (capture: PhotoCapture) => mixed,
  +navigation:
    | AppNavigationProp<'ChatCameraModal'>
    | AppNavigationProp<'UserAvatarCameraModal'>
    | AppNavigationProp<'ThreadAvatarCameraModal'>
    | AuthNavigationProp<'RegistrationUserAvatarCameraModal'>,
};

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

const CameraModal: React.ComponentType<Props> = React.memo<Props>(
  function CameraModal(props: Props) {
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

    React.useEffect(() => {
      return () => {
        Orientation.lockToPortrait();
      };
    }, []);

    const [flashMode, setFlashMode] = React.useState(
      RNCamera.Constants.FlashMode.off,
    );

    const changeFlashMode = React.useCallback(() => {
      setFlashMode(prevFlashMode => {
        if (prevFlashMode === RNCamera.Constants.FlashMode.on) {
          return RNCamera.Constants.FlashMode.off;
        } else if (prevFlashMode === RNCamera.Constants.FlashMode.off) {
          return RNCamera.Constants.FlashMode.auto;
        }
        return RNCamera.Constants.FlashMode.on;
      });
    }, []);

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
      React.useState<AutoFocusPointOfInterest>();

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

    const updateZoom = React.useCallback((nextZoom: number) => {
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

    const closeButtonRef =
      React.useRef<?React.ElementRef<TouchableOpacityInstance>>();
    const closeButtonDimensions = useSharedValue({
      x: -1,
      y: -1,
      width: 0,
      height: 0,
    });

    const photoButtonRef =
      React.useRef<?React.ElementRef<TouchableOpacityInstance>>();
    const photoButtonDimensions = useSharedValue({
      x: -1,
      y: -1,
      width: 0,
      height: 0,
    });

    const switchCameraButtonRef =
      React.useRef<?React.ElementRef<TouchableOpacityInstance>>();
    const switchCameraButtonDimensions = useSharedValue({
      x: -1,
      y: -1,
      width: 0,
      height: 0,
    });

    const flashButtonRef =
      React.useRef<?React.ElementRef<TouchableOpacityInstance>>();
    const flashButtonDimensions = useSharedValue({
      x: -1,
      y: -1,
      width: 0,
      height: 0,
    });

    const onCloseButtonLayout = React.useCallback(() => {
      if (!closeButtonRef.current) {
        return;
      }
      closeButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        closeButtonDimensions.value = { x: pageX, y: pageY, width, height };
      });
    }, [closeButtonDimensions]);

    const onPhotoButtonLayout = React.useCallback(() => {
      if (!photoButtonRef.current) {
        return;
      }
      photoButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        photoButtonDimensions.value = { x: pageX, y: pageY, width, height };
      });
    }, [photoButtonDimensions]);

    const onSwitchCameraButtonLayout = React.useCallback(() => {
      if (!switchCameraButtonRef.current) {
        return;
      }
      switchCameraButtonRef.current.measure(
        (x, y, width, height, pageX, pageY) => {
          switchCameraButtonDimensions.value = {
            x: pageX,
            y: pageY,
            width,
            height,
          };
        },
      );
    }, [switchCameraButtonDimensions]);

    React.useEffect(() => {
      if (!hasCamerasOnBothSides) {
        switchCameraButtonDimensions.value = {
          x: -1,
          y: -1,
          width: 0,
          height: 0,
        };
      }
    }, [hasCamerasOnBothSides, switchCameraButtonDimensions]);

    const onFlashButtonLayout = React.useCallback(() => {
      if (!flashButtonRef.current) {
        return;
      }
      flashButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        flashButtonDimensions.value = { x: pageX, y: pageY, width, height };
      });
    }, [flashButtonDimensions]);

    const outsideButtons = React.useCallback(
      (x: number, y: number) => {
        'worklet';
        const isOutsideButton = (dim: Dimensions) => {
          return (
            x < dim.x ||
            x > dim.x + dim.width ||
            y < dim.y ||
            y > dim.y + dim.height
          );
        };
        const isOutsideCloseButton = isOutsideButton(
          closeButtonDimensions.value,
        );
        const isOutsidePhotoButton = isOutsideButton(
          photoButtonDimensions.value,
        );
        const isOutsideSwitchCameraButton = isOutsideButton(
          switchCameraButtonDimensions.value,
        );
        const isOutsideFlashButton = isOutsideButton(
          flashButtonDimensions.value,
        );

        return (
          isOutsideCloseButton &&
          isOutsidePhotoButton &&
          isOutsideSwitchCameraButton &&
          isOutsideFlashButton
        );
      },
      [
        closeButtonDimensions,
        flashButtonDimensions,
        photoButtonDimensions,
        switchCameraButtonDimensions,
      ],
    );

    const focusIndicatorScale = useSharedValue(0.75);
    const focusIndicatorPosition = useSharedValue({ x: 0, y: 0 });
    const focusIndicatorOpacity = useSharedValue(0);
    const numScaleLoops = useSharedValue(0);

    const startFocusAnimation = React.useCallback(
      (x: number, y: number) => {
        'worklet';
        focusIndicatorPosition.value = { x, y };
        focusIndicatorOpacity.value = 1;
        numScaleLoops.value = 0;
        focusIndicatorScale.value = 0.75;
        focusIndicatorScale.value = withSpring(1, indicatorSpringConfig);
      },
      [
        focusIndicatorOpacity,
        focusIndicatorPosition,
        focusIndicatorScale,
        numScaleLoops,
      ],
    );

    useAnimatedReaction(
      () => focusIndicatorScale.value,
      (prevScale, currScale) => {
        if (prevScale <= 1.2 && currScale > 1.2) {
          numScaleLoops.value++;
        }
        if (numScaleLoops.value > 1) {
          numScaleLoops.value = 0;
          focusIndicatorScale.value = withDelay(
            400,
            withTiming(0, indicatorTimingConfig),
          );
          focusIndicatorOpacity.value = withDelay(
            400,
            withTiming(0, indicatorTimingConfig),
          );
        }
      },
    );

    const cancelFocusAnimation = React.useCallback(() => {
      cancelAnimation(focusIndicatorScale);
      cancelAnimation(focusIndicatorOpacity);
      focusIndicatorOpacity.value = 0;
    }, [focusIndicatorOpacity, focusIndicatorScale]);

    const focusIndicatorAnimatedStyle = useAnimatedStyle(
      () => ({
        opacity: focusIndicatorOpacity.value,
        transform: [
          { translateX: focusIndicatorPosition.value.x },
          { translateY: focusIndicatorPosition.value.y },
          { scale: focusIndicatorScale.value },
        ],
      }),
      [],
    );

    const focusIndicatorStyle = React.useMemo(
      () => [styles.focusIndicator, focusIndicatorAnimatedStyle],
      [focusIndicatorAnimatedStyle],
    );

    const zoomBase = useSharedValue(1);
    const zoomReported = useSharedValue(1);
    const currentZoom = useSharedValue(1);

    const onPinchUpdate = React.useCallback(
      (pinchScale: number) => {
        'worklet';
        currentZoom.value = clampV2(zoomBase.value * pinchScale, 1, 8);
        if (
          Math.abs(currentZoom.value / zoomReported.value - 1) >
          zoomUpdateFactor
        ) {
          zoomReported.value = currentZoom.value;
          const cameraZoomFactor = interpolate(
            zoomReported.value,
            [1, 8],
            [0, 1],
            Extrapolate.CLAMP,
          );
          runOnJS(updateZoom)(cameraZoomFactor);
        }
      },
      [currentZoom, updateZoom, zoomBase.value, zoomReported],
    );

    const onPinchEnd = React.useCallback(() => {
      'worklet';
      zoomReported.value = currentZoom.value;
      zoomBase.value = currentZoom.value;
      const cameraZoomFactor = interpolate(
        zoomReported.value,
        [1, 8],
        [0, 1],
        Extrapolate.CLAMP,
      );
      runOnJS(updateZoom)(cameraZoomFactor);
    }, [currentZoom, updateZoom, zoomBase, zoomReported]);

    const gesture = React.useMemo(() => {
      const pinchGesture = Gesture.Pinch()
        .onUpdate(({ scale }) => onPinchUpdate(scale))
        .onEnd(() => onPinchEnd());
      const tapGesture = Gesture.Tap().onStart(({ x, y }) => {
        if (outsideButtons(x, y)) {
          runOnJS(focusOnPoint)([x, y]);
          startFocusAnimation(x, y);
        }
      });
      return Gesture.Exclusive(pinchGesture, tapGesture);
    }, [
      focusOnPoint,
      onPinchEnd,
      onPinchUpdate,
      outsideButtons,
      startFocusAnimation,
    ]);

    const stagingModeProgress = useSharedValue(0);

    const overlayAnimatedStyle = useAnimatedStyle(() => {
      const overlayOpacity = interpolate(
        stagingModeProgress.value,
        [0, 0.01, 1],
        [0, 0.5, 0],
        Extrapolate.CLAMP,
      );
      return {
        opacity: overlayOpacity,
      };
    });

    const overlayStyle = React.useMemo(
      () => [styles.overlay, overlayAnimatedStyle],
      [overlayAnimatedStyle],
    );

    const sendButtonProgress = React.useRef(new Animated.Value(0));

    const sendButtonStyle = React.useMemo(() => {
      const sendButtonScale = sendButtonProgress.current.interpolate({
        inputRange: [0, 1],
        outputRange: ([1.1, 1]: number[]), // Flow...
      });
      return {
        opacity: sendButtonProgress.current,
        transform: [{ scale: sendButtonScale }],
      };
    }, []);

    const prevDeviceOrientation = React.useRef<?Orientations>();
    React.useEffect(() => {
      if (deviceOrientation !== prevDeviceOrientation.current) {
        setAutoFocusPointOfInterest(null);
        cancelFocusAnimation();
      }
      prevDeviceOrientation.current = deviceOrientation;
    }, [cancelFocusAnimation, deviceOrientation]);

    React.useEffect(() => {
      if (foreground && cameraRef.current) {
        void cameraRef.current.refreshAuthorizationStatus();
      }
    }, [foreground]);

    const prevStagingMode = React.useRef(false);
    React.useEffect(() => {
      if (stagingMode && !prevStagingMode.current) {
        cancelFocusAnimation();
        stagingModeProgress.value = withTiming(1, stagingModeAnimationConfig);
      } else if (!stagingMode && prevStagingMode.current) {
        stagingModeProgress.value = 0;
      }
      prevStagingMode.current = stagingMode;
    }, [cancelFocusAnimation, stagingMode, stagingModeProgress]);

    const prevPendingPhotoCapture = React.useRef<?PhotoCapture>();
    React.useEffect(() => {
      if (pendingPhotoCapture && !prevPendingPhotoCapture.current) {
        Animated.timing(sendButtonProgress.current, {
          ...sendButtonAnimationConfig,
          toValue: 1,
        }).start();
      } else if (!pendingPhotoCapture && prevPendingPhotoCapture.current) {
        void cleanUpPendingPhotoCapture(prevPendingPhotoCapture.current);
        sendButtonProgress.current.setValue(0);
      }
      prevPendingPhotoCapture.current = pendingPhotoCapture;
    }, [pendingPhotoCapture]);

    const containerAnimatedStyle = useAnimatedStyle(
      () => ({
        opacity: overlayContext?.positionV2?.value,
      }),
      [overlayContext],
    );

    const containerStyle = React.useMemo(() => {
      if (!overlayContext) {
        return styles.container;
      }
      return [styles.container, containerAnimatedStyle];
    }, [containerAnimatedStyle, overlayContext]);

    const renderCamera = ({
      camera,
      status,
    }: {
      +camera: RNCamera & { +_cameraHandle?: mixed, ... },
      status: RNCameraStatus,
      ...
    }): React.Node => {
      if (camera && camera._cameraHandle) {
        void fetchCameraIDs(camera);
      }
      if (stagingMode) {
        return renderStagingView();
      }

      return (
        <SafeAreaView style={styles.fill}>
          <View style={styles.fill}>
            {renderCameraContent(status)}
            <TouchableOpacity
              onPress={close}
              onLayout={onCloseButtonLayout}
              style={styles.closeButton}
              ref={closeButtonRef}
            >
              <Text style={styles.closeIcon}>×</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    };

    const renderStagingView = (): React.Node => {
      let image = null;
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
                onPress={clearPendingImage}
                style={styles.retakeButton}
              >
                <Icon name="ios-arrow-back" style={styles.retakeIcon} />
              </TouchableOpacity>
              <SendMediaButton
                onPress={sendPhoto}
                pointerEvents={pendingPhotoCapture ? 'auto' : 'none'}
                containerStyle={styles.sendButtonContainer}
                style={sendButtonStyle}
              />
            </View>
          </SafeAreaView>
        </>
      );
    };

    const renderCameraContent = (status: RNCameraStatus): React.Node => {
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
      if (hasCamerasOnBothSides) {
        switchCameraButton = (
          <TouchableOpacity
            onPress={switchCamera}
            onLayout={onSwitchCameraButtonLayout}
            style={styles.switchCameraButton}
            ref={switchCameraButtonRef}
          >
            <Icon name="ios-camera-reverse" style={styles.switchCameraIcon} />
          </TouchableOpacity>
        );
      }

      let flashIcon;
      if (flashMode === RNCamera.Constants.FlashMode.on) {
        flashIcon = <Icon name="ios-flash" style={styles.flashIcon} />;
      } else if (flashMode === RNCamera.Constants.FlashMode.off) {
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
        <GestureDetector gesture={gesture}>
          <Reanimated.View style={styles.fill}>
            <Reanimated.View style={focusIndicatorStyle} />
            <TouchableOpacity
              onPress={changeFlashMode}
              onLayout={onFlashButtonLayout}
              style={styles.flashButton}
              ref={flashButtonRef}
            >
              {flashIcon}
            </TouchableOpacity>
            <View style={styles.bottomButtonsContainer}>
              <TouchableOpacity
                onPress={takePhoto}
                onLayout={onPhotoButtonLayout}
                style={styles.saveButton}
                ref={photoButtonRef}
              >
                <View style={styles.saveButtonInner} />
              </TouchableOpacity>
              {switchCameraButton}
            </View>
          </Reanimated.View>
        </GestureDetector>
      );
    };

    const statusBar = isActive ? <ConnectedStatusBar hidden /> : null;
    const type = useFrontCamera
      ? RNCamera.Constants.Type.front
      : RNCamera.Constants.Type.back;
    return (
      <Reanimated.View style={containerStyle}>
        {statusBar}
        <RNCamera
          type={type}
          captureAudio={false}
          maxZoom={maxZoom}
          zoom={zoom}
          flashMode={flashMode}
          autoFocusPointOfInterest={autoFocusPointOfInterest}
          style={styles.fill}
          androidCameraPermissionOptions={null}
          ref={cameraRef}
        >
          {renderCamera}
        </RNCamera>
        <Reanimated.View style={overlayStyle} pointerEvents="none" />
      </Reanimated.View>
    );
  },
);

export default CameraModal;
