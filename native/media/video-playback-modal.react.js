// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useState } from 'react';
import { View, Text, TouchableWithoutFeedback } from 'react-native';
import * as Progress from 'react-native-progress';
import Animated from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';

import type { MediaInfo } from 'lib/types/media-types';

import type { ChatMultimediaMessageInfoItem } from '../chat/multimedia-message.react';
import Button from '../components/button.react';
import ConnectedStatusBar from '../connected-status-bar.react';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import { OverlayContext } from '../navigation/overlay-context';
import type { NavigationRoute } from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils';
import { derivedDimensionsInfoSelector } from '../selectors/dimensions-selectors';
import { useStyles } from '../themes/colors';
import type { VerticalBounds, LayoutCoordinates } from '../types/layout-types';
import { formatDuration } from './video-utils';

/* eslint-disable import/no-named-as-default-member */
const {
  Extrapolate,
  set,
  add,
  sub,
  multiply,
  divide,
  max,
  min,
  abs,
  interpolate,
  useValue,
} = Animated;

export type VideoPlaybackModalParams = {|
  +presentedFrom: string,
  +mediaInfo: MediaInfo,
  +initialCoordinates: LayoutCoordinates,
  +verticalBounds: VerticalBounds,
  +item: ChatMultimediaMessageInfoItem,
|};

type Props = {|
  +navigation: AppNavigationProp<'VideoPlaybackModal'>,
  +route: NavigationRoute<'VideoPlaybackModal'>,
|};
function VideoPlaybackModal(props: Props) {
  const { mediaInfo } = props.route.params;
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

  const centerX = useValue(frame.width / 2);
  const centerY = useValue(frame.height / 2 + screenDimensions.topInset);
  const frameWidth = useValue(frame.width);
  const frameHeight = useValue(frame.height);
  const imageWidth = useValue(mediaDisplayDimensions.width);
  const imageHeight = useValue(mediaDisplayDimensions.height);

  React.useEffect(() => {
    const { width: frameW, height: frameH } = frame;
    const { topInset } = screenDimensions;
    frameWidth.setValue(frameW);
    frameHeight.setValue(frameH);

    centerX.setValue(frameW / 2);
    centerY.setValue(frameH / 2 + topInset);

    const { width, height } = mediaDisplayDimensions;
    imageWidth.setValue(width);
    imageHeight.setValue(height);
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

  const left = sub(centerX, divide(imageWidth, 2));
  const top = sub(centerY, divide(imageHeight, 2));

  const { initialCoordinates } = props.route.params;
  const initialScale = divide(initialCoordinates.width, imageWidth);
  const initialTranslateX = sub(
    initialCoordinates.x + initialCoordinates.width / 2,
    add(left, divide(imageWidth, 2)),
  );
  const initialTranslateY = sub(
    initialCoordinates.y + initialCoordinates.height / 2,
    add(top, divide(imageHeight, 2)),
  );

  // The all-important outputs
  const curScale = useValue(1);
  const curX = useValue(0);
  const curY = useValue(0);
  const curBackdropOpacity = useValue(1);

  const progressiveOpacity = max(
    min(
      sub(1, abs(divide(curX, frameWidth))),
      sub(1, abs(divide(curY, frameHeight))),
    ),
    0,
  );

  const updates = [set(curBackdropOpacity, progressiveOpacity)];
  const updatedScale = [updates, curScale];
  const updatedCurX = [updates, curX];
  const updatedCurY = [updates, curY];
  const updatedBackdropOpacity = [updates, curBackdropOpacity];

  const overlayContext = React.useContext(OverlayContext);
  invariant(overlayContext, 'VideoPlaybackModal should have OverlayContext');
  const navigationProgress = overlayContext.position;

  const reverseNavigationProgress = sub(1, navigationProgress);
  const scale = add(
    multiply(reverseNavigationProgress, initialScale),
    multiply(navigationProgress, updatedScale),
  );
  const x = add(
    multiply(reverseNavigationProgress, initialTranslateX),
    multiply(navigationProgress, updatedCurX),
  );
  const y = add(
    multiply(reverseNavigationProgress, initialTranslateY),
    multiply(navigationProgress, updatedCurY),
  );

  const backdropOpacity = multiply(navigationProgress, updatedBackdropOpacity);
  const imageContainerOpacity = interpolate(navigationProgress, {
    inputRange: [0, 0.1],
    outputRange: [0, 1],
    extrapolate: Extrapolate.CLAMP,
  });
  const { verticalBounds } = props.route.params;
  const videoContainerStyle = React.useMemo(() => {
    const { height, width } = mediaDisplayDimensions;
    const { height: frameH, width: frameW } = frame;

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
    imageContainerOpacity,
    x,
    y,
    scale,
  ]);

  const styles = useStyles(unboundStyles);

  const [paused, setPaused] = useState(false);
  const [percentElapsed, setPercentElapsed] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState('0:00');
  const [totalDuration, setTotalDuration] = useState('0:00');
  const videoRef = React.useRef();

  const {
    navigation,
    route: {
      params: {
        mediaInfo: { uri: videoUri },
      },
    },
  } = props;

  const togglePlayback = React.useCallback(() => {
    setPaused(!paused);
  }, [paused]);

  const togglePlaybackControls = React.useCallback(() => {
    setControlsVisible(!controlsVisible);
  }, [controlsVisible]);

  const resetVideo = React.useCallback(() => {
    invariant(videoRef.current, 'videoRef.current should be set in resetVideo');
    videoRef.current.seek(0);
  }, []);

  const progressCallback = React.useCallback((res) => {
    setTimeElapsed(formatDuration(res.currentTime));
    setTotalDuration(formatDuration(res.seekableDuration));
    setPercentElapsed(
      Math.ceil((res.currentTime / res.seekableDuration) * 100),
    );
  }, []);

  const statusBar = overlayContext.isDismissing ? null : (
    <ConnectedStatusBar hidden />
  );

  const backdropStyle = React.useMemo(() => ({ opacity: backdropOpacity }), [
    backdropOpacity,
  ]);

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

  const controls = (
    <>
      <View style={styles.header}>
        <View style={styles.closeButton}>
          <Button onPress={navigation.goBackOnce}>
            <Icon name="close" size={30} style={styles.iconButton} />
          </Button>
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.playPauseButton}>
          <TouchableWithoutFeedback onPress={togglePlayback}>
            <Icon
              name={paused ? 'play' : 'pause'}
              size={28}
              style={styles.iconButton}
            />
          </TouchableWithoutFeedback>

          <View style={styles.progressBar}>
            <Progress.Bar
              progress={percentElapsed / 100}
              height={4}
              width={260}
              color={styles.progressBar.color}
            />
          </View>

          <Text style={styles.durationText}>
            {timeElapsed} / {totalDuration}
          </Text>
        </View>
      </View>
    </>
  );

  return (
    <Animated.View style={styles.modal}>
      {statusBar}
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <View style={contentContainerStyle}>
        <Animated.View style={videoContainerStyle}>
          <TouchableWithoutFeedback onPress={togglePlaybackControls}>
            <Video
              source={{ uri: videoUri }}
              ref={videoRef}
              style={styles.backgroundVideo}
              paused={paused}
              onProgress={progressCallback}
              onEnd={resetVideo}
            />
          </TouchableWithoutFeedback>
        </Animated.View>
      </View>
      {controlsVisible ? controls : null}
    </Animated.View>
  );
}

const unboundStyles = {
  modal: {
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
    justifyContent: 'flex-end',
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    position: 'absolute',
    justifyContent: 'flex-start',
    left: 0,
    right: 0,
    top: 0,
  },
  playPauseButton: {
    backgroundColor: 'rgba(52,52,52,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    flex: 0,
    height: 76,
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
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    paddingRight: 10,
  },
  iconButton: {
    paddingRight: 10,
    color: 'white',
  },
  durationText: {
    color: 'white',
    fontSize: 11,
  },
  backdrop: {
    backgroundColor: 'black',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
};

export default VideoPlaybackModal;
