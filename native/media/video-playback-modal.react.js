// @flow

import Icon from '@expo/vector-icons/MaterialCommunityIcons.js';
import invariant from 'invariant';
import * as React from 'react';
import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import filesystem from 'react-native-fs';
// $FlowFixMe: we don't have yet flow types for GH v2 API
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Progress from 'react-native-progress';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  Extrapolate,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Video from 'react-native-video';

import { MediaCacheContext } from 'lib/components/media-cache-provider.react.js';
import { encryptedMediaBlobURI } from 'lib/media/media-utils.js';
import { useIsAppBackgroundedOrInactive } from 'lib/shared/lifecycle-utils.js';
import type { MediaInfo } from 'lib/types/media-types.js';

import { useFetchAndDecryptMedia } from './encryption-utils.js';
import { formatDuration } from './video-utils.js';
import ConnectedStatusBar from '../connected-status-bar.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { derivedDimensionsInfoSelector } from '../selectors/dimensions-selectors.js';
import { useStyles } from '../themes/colors.js';
import type { ChatMultimediaMessageInfoItem } from '../types/chat-types.js';
import type {
  VerticalBounds,
  LayoutCoordinates,
} from '../types/layout-types.js';
import type { NativeMethods } from '../types/react-native.js';

type TouchableOpacityInstance = React.AbstractComponent<
  React.ElementConfig<typeof TouchableOpacity>,
  NativeMethods,
>;

type VideoRef = {
  +seek: number => mixed,
  ...
};

export type VideoPlaybackModalParams = {
  +presentedFrom: string,
  +mediaInfo: MediaInfo,
  +initialCoordinates: LayoutCoordinates,
  +verticalBounds: VerticalBounds,
  +item: ChatMultimediaMessageInfoItem,
};

type ReactNativeVideoOnProgressData = {
  +currentTime: number,
  +playableDuration: number,
  +seekableDuration: number,
};

type Props = {
  +navigation: AppNavigationProp<'VideoPlaybackModal'>,
  +route: NavigationRoute<'VideoPlaybackModal'>,
};
function VideoPlaybackModal(props: Props): React.Node {
  const { mediaInfo } = props.route.params;

  const { uri: videoURI } = mediaInfo;
  const [videoSource, setVideoSource] = React.useState(
    videoURI ? { uri: videoURI } : undefined,
  );

  const mediaCache = React.useContext(MediaCacheContext);
  const fetchAndDecryptMedia = useFetchAndDecryptMedia();

  React.useEffect(() => {
    if (
      mediaInfo.type !== 'encrypted_photo' &&
      mediaInfo.type !== 'encrypted_video'
    ) {
      return undefined;
    }
    const { index, ...rest } = mediaInfo;
    const blobURI = encryptedMediaBlobURI(rest);
    const { encryptionKey } = mediaInfo;

    let isMounted = true;
    let uriToDispose;
    setVideoSource(undefined);

    const loadDecrypted = async () => {
      const cached = await mediaCache?.get(blobURI);
      if (cached && isMounted) {
        setVideoSource({ uri: cached });
        return;
      }

      const { result } = await fetchAndDecryptMedia(blobURI, encryptionKey, {
        destination: 'file',
      });
      if (result.success) {
        const { uri } = result;
        const cacheSetPromise = mediaCache?.set(blobURI, uri);
        if (isMounted) {
          uriToDispose = uri;
          setVideoSource({ uri });
        } else {
          // dispose of the temporary file immediately when unmounted
          // but wait for the cache to be set
          await cacheSetPromise;
          filesystem.unlink(uri);
        }
      }
    };
    void loadDecrypted();

    return () => {
      isMounted = false;
      if (uriToDispose) {
        // remove the temporary file created by decryptMedia
        filesystem.unlink(uriToDispose);
      }
    };
  }, [mediaInfo, mediaCache, fetchAndDecryptMedia]);

  const closeButtonX = useSharedValue(-1);
  const closeButtonY = useSharedValue(-1);
  const closeButtonWidth = useSharedValue(-1);
  const closeButtonHeight = useSharedValue(-1);
  const closeButtonRef =
    React.useRef<?React.ElementRef<TouchableOpacityInstance>>();
  const closeButton = closeButtonRef.current;
  const onCloseButtonLayoutCalledRef = React.useRef(false);
  const onCloseButtonLayout = React.useCallback(() => {
    onCloseButtonLayoutCalledRef.current = true;
  }, []);
  const onCloseButtonLayoutCalled = onCloseButtonLayoutCalledRef.current;
  React.useEffect(() => {
    if (!closeButton || !onCloseButtonLayoutCalled) {
      return;
    }
    closeButton.measure((x, y, width, height, pageX, pageY) => {
      closeButtonX.value = pageX;
      closeButtonY.value = pageY;
      closeButtonWidth.value = width;
      closeButtonHeight.value = height;
    });
  }, [
    closeButton,
    onCloseButtonLayoutCalled,
    closeButtonX,
    closeButtonY,
    closeButtonWidth,
    closeButtonHeight,
  ]);

  const footerX = useSharedValue(-1);
  const footerY = useSharedValue(-1);
  const footerWidth = useSharedValue(-1);
  const footerHeight = useSharedValue(-1);
  const footerRef = React.useRef<?React.ElementRef<typeof View>>();
  const footer = footerRef.current;
  const onFooterLayoutCalledRef = React.useRef(false);
  const onFooterLayout = React.useCallback(() => {
    onFooterLayoutCalledRef.current = true;
  }, []);
  const onFooterLayoutCalled = onFooterLayoutCalledRef.current;
  React.useEffect(() => {
    if (!footer || !onFooterLayoutCalled) {
      return;
    }
    footer.measure((x, y, width, height, pageX, pageY) => {
      footerX.value = pageX;
      footerY.value = pageY;
      footerWidth.value = width;
      footerHeight.value = height;
    });
  }, [
    footer,
    onFooterLayoutCalled,
    footerX,
    footerY,
    footerWidth,
    footerHeight,
  ]);

  const controlsShowing = useSharedValue<number>(1);
  const outsideButtons = React.useCallback(
    (x: number, y: number) => {
      'worklet';
      if (controlsShowing.value === 0) {
        return true;
      }
      const isOutsideCloseButton =
        x < closeButtonX.value ||
        x > closeButtonX.value + closeButtonWidth.value ||
        y < closeButtonY.value ||
        y > closeButtonY.value + closeButtonHeight.value;
      const isOutsideFooter =
        x < footerX.value ||
        x > footerX.value + footerWidth.value ||
        y < footerY.value ||
        y > footerY.value + footerHeight.value;
      return isOutsideCloseButton && isOutsideFooter;
    },
    [
      closeButtonHeight,
      closeButtonWidth,
      closeButtonX,
      closeButtonY,
      controlsShowing,
      footerHeight,
      footerWidth,
      footerX,
      footerY,
    ],
  );

  /* ===== START FADE CONTROL ANIMATION ===== */

  const activeControlsOpacity = useSharedValue<number>(1);

  const singleTap = Gesture.Tap().onEnd(({ x, y }) => {
    if (outsideButtons(x, y)) {
      controlsShowing.value = 1 - controlsShowing.value;
      activeControlsOpacity.value = withTiming(controlsShowing.value, {
        duration: 150,
      });
    }
  });

  const [controlsEnabled, setControlsEnabled] = React.useState(true);
  const enableControls = React.useCallback(() => setControlsEnabled(true), []);
  const disableControls = React.useCallback(
    () => setControlsEnabled(false),
    [],
  );

  useAnimatedReaction(
    () => Math.ceil(activeControlsOpacity.value),
    (currentOpacityCeiling, previousOpacityCeiling) => {
      if (previousOpacityCeiling !== currentOpacityCeiling) {
        if (currentOpacityCeiling === 0) {
          runOnJS(disableControls)();
        } else {
          runOnJS(enableControls)();
        }
      }
    },
  );

  /* ===== END FADE CONTROL ANIMATION ===== */

  const mediaDimensions = mediaInfo.dimensions;
  const screenDimensions = useSelector(derivedDimensionsInfoSelector);

  const frame = React.useMemo(
    () => ({
      width: screenDimensions.width,
      height: screenDimensions.safeAreaHeight,
    }),
    [screenDimensions],
  );

  const mediaDisplayDimensions = React.useMemo(() => {
    let { height: maxHeight, width: maxWidth } = frame;
    if (maxHeight > maxWidth) {
      maxHeight -= 100;
    } else {
      maxWidth -= 100;
    }

    if (
      mediaDimensions.height < maxHeight &&
      mediaDimensions.width < maxWidth
    ) {
      return mediaDimensions;
    }

    const heightRatio = maxHeight / mediaDimensions.height;
    const widthRatio = maxWidth / mediaDimensions.width;

    if (heightRatio < widthRatio) {
      return {
        height: maxHeight,
        width: mediaDimensions.width * heightRatio,
      };
    } else {
      return {
        width: maxWidth,
        height: mediaDimensions.height * widthRatio,
      };
    }
  }, [frame, mediaDimensions]);

  const centerX = useSharedValue(frame.width / 2);
  const centerY = useSharedValue(frame.height / 2 + screenDimensions.topInset);
  const frameWidth = useSharedValue(frame.width);
  const frameHeight = useSharedValue(frame.height);
  const imageWidth = useSharedValue(mediaDisplayDimensions.width);
  const imageHeight = useSharedValue(mediaDisplayDimensions.height);

  React.useEffect(() => {
    const { width: frameW, height: frameH } = frame;
    const { topInset } = screenDimensions;
    frameWidth.value = frameW;
    frameHeight.value = frameH;

    centerX.value = frameW / 2;
    centerY.value = frameH / 2 + topInset;

    const { width, height } = mediaDisplayDimensions;
    imageWidth.value = width;
    imageHeight.value = height;
  }, [
    screenDimensions,
    frame,
    mediaDisplayDimensions,
    frameWidth,
    frameHeight,
    centerX,
    centerY,
    imageWidth,
    imageHeight,
  ]);

  const { initialCoordinates } = props.route.params;

  const curScale = useSharedValue(1);
  const curX = useSharedValue(0);
  const curY = useSharedValue(0);

  const curBackdropOpacity = useDerivedValue(() => {
    return Math.max(
      Math.min(
        1 - Math.abs(curX.value / frameWidth.value),
        1 - Math.abs(curY.value / frameHeight.value),
      ),
      0,
    );
  });

  const overlayContext = React.useContext(OverlayContext);
  invariant(overlayContext, 'VideoPlaybackModal should have OverlayContext');
  const navigationProgress = overlayContext.positionV2;
  invariant(
    navigationProgress,
    'position should be defined in VideoPlaybackModal',
  );

  const controlsAnimatedStyle = useAnimatedStyle(() => {
    const dismissalButtonOpacity = interpolate(
      curBackdropOpacity.value,
      [0.95, 1],
      [0, 1],
      Extrapolate.CLAMP,
    );
    const controlsOpacity =
      navigationProgress.value *
      dismissalButtonOpacity *
      activeControlsOpacity.value;
    return {
      opacity: controlsOpacity,
    };
  });

  const { verticalBounds } = props.route.params;
  const videoContainerStyle = useAnimatedStyle(() => {
    const { height, width } = mediaDisplayDimensions;
    const { height: frameH, width: frameW } = frame;

    const imageContainerOpacity = interpolate(
      navigationProgress.value,
      [0, 0.1],
      [0, 1],
      Extrapolate.CLAMP,
    );

    const reverseNavigationProgress = 1 - navigationProgress.value;

    const left = centerX.value - imageWidth.value / 2;
    const top = centerY.value - imageHeight.value / 2;

    const initialScale = initialCoordinates.width / imageWidth.value;

    const initialTranslateX =
      initialCoordinates.x +
      initialCoordinates.width / 2 -
      (left + imageWidth.value / 2);

    const initialTranslateY =
      initialCoordinates.y +
      initialCoordinates.height / 2 -
      (top + imageHeight.value / 2);

    const scale =
      reverseNavigationProgress * initialScale +
      navigationProgress.value * curScale.value;
    const x =
      reverseNavigationProgress * initialTranslateX +
      navigationProgress.value * curX.value;
    const y =
      reverseNavigationProgress * initialTranslateY +
      navigationProgress.value * curY.value;

    return {
      height,
      width,
      marginTop:
        (frameH - height) / 2 + screenDimensions.topInset - verticalBounds.y,
      marginLeft: (frameW - width) / 2,
      opacity: imageContainerOpacity,
      transform: [{ translateX: x }, { translateY: y }, { scale: scale }],
    };
  }, [
    mediaDisplayDimensions,
    frame,
    screenDimensions.topInset,
    verticalBounds.y,
    initialCoordinates,
  ]);

  const styles = useStyles(unboundStyles);

  const [paused, setPaused] = useState(false);
  const [percentElapsed, setPercentElapsed] = useState(0);
  const [spinnerVisible, setSpinnerVisible] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState('0:00');
  const [totalDuration, setTotalDuration] = useState('0:00');
  const videoRef = React.useRef<?VideoRef>();

  const backgroundedOrInactive = useIsAppBackgroundedOrInactive();
  React.useEffect(() => {
    if (backgroundedOrInactive) {
      setPaused(true);
      controlsShowing.value = 1;
    }
  }, [backgroundedOrInactive, controlsShowing]);

  const { navigation } = props;

  const togglePlayback = React.useCallback(() => {
    setPaused(!paused);
  }, [paused]);

  const resetVideo = React.useCallback(() => {
    invariant(videoRef.current, 'videoRef.current should be set in resetVideo');
    videoRef.current.seek(0);
  }, []);

  const progressCallback = React.useCallback(
    (res: ReactNativeVideoOnProgressData) => {
      setTimeElapsed(formatDuration(res.currentTime));
      setTotalDuration(formatDuration(res.seekableDuration));
      setPercentElapsed(
        Math.ceil((res.currentTime / res.seekableDuration) * 100),
      );
    },
    [],
  );

  const readyForDisplayCallback = React.useCallback(() => {
    setSpinnerVisible(false);
  }, []);

  const statusBar = overlayContext.isDismissing ? null : (
    <ConnectedStatusBar hidden />
  );

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const backdropOpacity = navigationProgress.value * curBackdropOpacity.value;
    return {
      opacity: backdropOpacity,
    };
  });

  const contentContainerStyle = React.useMemo(() => {
    const fullScreenHeight = screenDimensions.height;
    const bottom = fullScreenHeight - verticalBounds.y - verticalBounds.height;

    // margin will clip, but padding won't
    const verticalStyle = overlayContext.isDismissing
      ? { marginTop: verticalBounds.y, marginBottom: bottom }
      : { paddingTop: verticalBounds.y, paddingBottom: bottom };
    return [styles.contentContainer, verticalStyle];
  }, [
    screenDimensions.height,
    verticalBounds.y,
    verticalBounds.height,
    overlayContext.isDismissing,
    styles.contentContainer,
  ]);

  const controlsContainerStyle = React.useMemo(
    () => [styles.controls, controlsAnimatedStyle],
    [controlsAnimatedStyle, styles.controls],
  );

  const backdropStyle = React.useMemo(
    () => [styles.backdrop, backdropAnimatedStyle],
    [backdropAnimatedStyle, styles.backdrop],
  );

  let controls;
  if (videoSource) {
    controls = (
      <Animated.View
        style={controlsContainerStyle}
        pointerEvents={controlsEnabled ? 'box-none' : 'none'}
      >
        <SafeAreaView style={styles.fill}>
          <View style={styles.fill}>
            <View style={styles.header}>
              <View style={styles.closeButton}>
                <TouchableOpacity
                  onPress={navigation.goBackOnce}
                  ref={(closeButtonRef: any)}
                  onLayout={onCloseButtonLayout}
                >
                  <Icon name="close" size={30} style={styles.iconButton} />
                </TouchableOpacity>
              </View>
            </View>
            <View
              style={styles.footer}
              ref={footerRef}
              onLayout={onFooterLayout}
            >
              <TouchableOpacity
                onPress={togglePlayback}
                style={styles.playPauseButton}
              >
                <Icon
                  name={paused ? 'play' : 'pause'}
                  size={28}
                  style={styles.iconButton}
                />
              </TouchableOpacity>
              <View style={styles.progressBar}>
                <Progress.Bar
                  progress={percentElapsed / 100}
                  height={4}
                  width={null}
                  color={styles.progressBar.color}
                  style={styles.expand}
                />
              </View>
              <Text style={styles.durationText}>
                {timeElapsed} / {totalDuration}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    );
  }

  let spinner;
  if (spinnerVisible) {
    spinner = (
      <Progress.Circle
        size={80}
        indeterminate={true}
        color="white"
        style={styles.progressCircle}
      />
    );
  }

  let videoPlayer;
  if (videoSource) {
    videoPlayer = (
      <Video
        source={videoSource}
        ref={videoRef}
        style={styles.backgroundVideo}
        paused={paused}
        onProgress={progressCallback}
        onEnd={resetVideo}
        onReadyForDisplay={readyForDisplayCallback}
      />
    );
  }

  return (
    <GestureDetector gesture={singleTap}>
      <Animated.View style={styles.expand}>
        {statusBar}
        <Animated.View style={backdropStyle} />
        <View style={contentContainerStyle}>
          {spinner}
          <Animated.View style={videoContainerStyle}>
            {videoPlayer}
          </Animated.View>
        </View>
        {controls}
      </Animated.View>
    </GestureDetector>
  );
}

const unboundStyles = {
  expand: {
    flex: 1,
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(52,52,52,0.6)',
    height: 76,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  playPauseButton: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    paddingTop: 10,
    paddingRight: 20,
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexDirection: 'row',
    height: 100,
  },
  progressBar: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    paddingRight: 10,
    display: 'flex',
    flexDirection: 'row',
  },
  progressCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  iconButton: {
    marginHorizontal: 10,
    color: 'white',
  },
  durationText: {
    color: 'white',
    fontSize: 11,
    width: 70,
  },
  backdrop: {
    backgroundColor: 'black',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
};

export default VideoPlaybackModal;
