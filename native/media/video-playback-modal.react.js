// @flow

import invariant from 'invariant';
import { useSelector } from '../redux/redux-utils';
import ConnectedStatusBar from '../connected-status-bar.react';

import type { MediaInfo } from 'lib/types/media-types';
import type {
  VerticalBounds,
  LayoutCoordinates,
} from '../types/layout-types';
import type { ChatMultimediaMessageInfoItem } from '../chat/multimedia-message.react';
import { derivedDimensionsInfoSelector } from '../selectors/dimensions-selectors';

import * as React from 'react';
import { useState } from 'react';
import { View, Text, TouchableWithoutFeedback } from 'react-native';
import * as Progress from 'react-native-progress';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';

import Button from '../components/button.react';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useStyles } from '../themes/colors';
import { OverlayContext } from '../navigation/overlay-context';
import Animated from 'react-native-reanimated';

/* eslint-disable import/no-named-as-default-member */
const {
  Value,
  Clock,
  event,
  Extrapolate,
  set,
  call,
  cond,
  not,
  and,
  or,
  eq,
  neq,
  greaterThan,
  lessThan,
  add,
  sub,
  multiply,
  divide,
  pow,
  max,
  min,
  round,
  abs,
  interpolate,
  startClock,
  stopClock,
  clockRunning,
  decay,
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
  const screenDimensions = useSelector(derivedDimensionsInfoSelector);
  const frame = React.useMemo(() => ({
    width: screenDimensions.width,
    height: screenDimensions.safeAreaHeight,
  }), [screenDimensions]);

  const { mediaInfo } = props.route.params;
  const mediaDimensions = mediaInfo.dimensions;
  const mediaDisplayDimensions = React.useMemo(() => {
    // Make space for the close button
    let { height: maxHeight, width: maxWidth } = frame;
    if (maxHeight > maxWidth) {
      maxHeight -= 100;
    } else {
      maxWidth -= 100;
    }

    if (mediaDimensions.height < maxHeight && mediaDimensions.width < maxWidth) {
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

  const centerXRef = React.useRef<Value>();
  const centerYRef = React.useRef<Value>();
  const frameWidthRef = React.useRef<Value>();
  const frameHeightRef = React.useRef<Value>();
  const imageWidthRef = React.useRef<Value>();
  const imageHeightRef = React.useRef<Value>();
  React.useEffect(() => {
    const { width: frameWidth, height: frameHeight } = frame;
    const { topInset } = screenDimensions;
    if (frameWidthRef.current) {
      frameWidthRef.current.setValue(frameWidth);
    } else {
      frameWidthRef.current = new Value(frameWidth);
    }
    if (frameHeightRef.current) {
      frameHeightRef.current.setValue(frameHeight);
    } else {
      frameHeightRef.current = new Value(frameHeight);
    }

    const centerX = frameWidth / 2;
    const centerY = frameHeight / 2 + topInset;
    if (centerXRef.current) {
      centerXRef.current.setValue(centerX);
    } else {
      centerXRef.current = new Value(centerX);
    }
    if (centerYRef.current) {
      centerYRef.current.setValue(centerY);
    } else {
      centerYRef.current = new Value(centerY);
    }

    const { width, height } = mediaDisplayDimensions;
    if (imageWidthRef.current) {
      imageWidthRef.current.setValue(width);
    } else {
      imageWidthRef.current = new Value(width);
    }
    if (imageHeightRef.current) {
      imageHeightRef.current.setValue(height);
    } else {
      imageHeightRef.current = new Value(height);
    }
  }, [screenDimensions, frame, mediaDisplayDimensions]);
  const centerX = centerXRef.current;
  const centerY = centerYRef.current;
  const frameWidth = frameWidthRef.current;
  const frameHeight = frameHeightRef.current;
  const imageWidth = imageWidthRef.current;
  const imageHeight = imageHeightRef.current;

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
  const curScale = new Value(1);
  const curX = new Value(0);
  const curY = new Value(0);
  const curBackdropOpacity = new Value(1);

  const updates = [
  ];
  const updatedScale = [updates, curScale];
  const updatedCurX = [updates, curX];
  const updatedCurY = [updates, curY];
  const updatedBackdropOpacity = [updates, curBackdropOpacity];

  const overlayContext = React.useContext(OverlayContext);
  invariant(overlayContext, 'MultimediaModal should have OverlayContext');
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
  const verticalBoundsY = verticalBounds.y;
  const videoContainerStyle = React.useMemo(() => {
    const { height, width } = mediaDisplayDimensions;
    const { height: frameHeight, width: frameWidth } = frame;
    const top = (frameHeight - height) / 2 + screenDimensions.topInset;
    const left = (frameWidth - width) / 2;
    return {
      height,
      width,
      marginTop: top - verticalBounds.y,
      marginLeft: left,
      opacity: imageContainerOpacity,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: scale },
      ],
    };
  }, [mediaDisplayDimensions, frame, screenDimensions.topInset, verticalBounds.y, imageContainerOpacity, x, y, scale]);

  const styles = useStyles(unboundStyles);

  const [paused, setPaused] = useState(false);
  const [percentElapsed, setPercentElapsed] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState('00');
  const [totalDuration, setTotalDuration] = useState('00');

  const {
    navigation,
    route: {
      params: { mediaInfo: { uri: videoUri } },
    },
  } = props;

  const togglePlayback = React.useCallback(() => {
    setPaused(!paused);
  }, [paused]);

  const progressCallback = React.useCallback((res) => {
    setTimeElapsed(res.currentTime.toFixed(0).padStart(2, '0'));
    setTotalDuration(res.seekableDuration.toFixed(0).padStart(2, '0'));
    setPercentElapsed(
      Math.ceil((res.currentTime / res.seekableDuration) * 100),
    );
  }, []);

  const resetVideo = React.useCallback(() => {
    this.player.seek(0);
  }, []);

  const togglePlaybackControls = React.useCallback(() => {
    setControlsVisible(!controlsVisible);
  }, [controlsVisible]);

  const statusBar = overlayContext.isDismissing ? null : (
    <ConnectedStatusBar hidden />
  );

  const backdropStyle = React.useMemo(() => ({ opacity: backdropOpacity }, [backdropOpacity]));

  return (
    <Animated.View style={styles.modal}>
      {statusBar}
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <Animated.View style={videoContainerStyle}>
        <TouchableWithoutFeedback onPress={togglePlaybackControls}>
          <Video
            source={{ uri: videoUri }}
            ref={(ref) => {
              this.player = ref;
            }}
            style={styles.backgroundVideo}
            paused={paused}
            onProgress={progressCallback}
            onEnd={resetVideo}
          />
        </TouchableWithoutFeedback>
      </Animated.View>
      {controlsVisible && (
        <>
          <View style={styles.header}>
            <View style={styles.closeButton}>
              <Button onPress={navigation.goBackOnce}>
                <Icon name="close" size={30} style={styles.composeButton} />
              </Button>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.playPauseButton}>
              <TouchableWithoutFeedback onPress={togglePlayback}>
                <Icon
                  name={paused ? 'play' : 'pause'}
                  size={28}
                  style={styles.composeButton}
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
                0:{timeElapsed} / 0:{totalDuration}
              </Text>
            </View>
          </View>
        </>
      )}
    </Animated.View>
  );
}

const unboundStyles = {
  modal: {
    backgroundColor: 'black',
    justifyContent: 'center',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    padding: 0,
    borderRadius: 0,
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
    paddingLeft: 20,
    justifyContent: 'flex-start',
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
  composeButton: {
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
};

export default VideoPlaybackModal;
