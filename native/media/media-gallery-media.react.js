// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import MaterialIcon from '@expo/vector-icons/MaterialIcons.js';
import LottieView from 'lottie-react-native';
import * as React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import {
  Easing as ReanimatedEasing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Video from 'react-native-video';

import { type MediaLibrarySelection } from 'lib/types/media-types.js';

import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react.js';
import { type DimensionsInfo } from '../redux/dimensions-updater.react.js';
import type { AnimatedValue } from '../types/react-native.js';
import {
  AnimatedView,
  AnimatedImage,
  type AnimatedStyleObj,
} from '../types/styles.js';

const animatedSpec = {
  duration: 400,
  easing: Easing.inOut(Easing.ease),
  useNativeDriver: true,
};
const reanimatedSpec = {
  duration: 400,
  easing: ReanimatedEasing.inOut(ReanimatedEasing.ease),
};

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

type Props = {
  +selection: MediaLibrarySelection,
  +containerHeight: number,
  +queueModeActive: boolean,
  +isQueued: boolean,
  +setMediaQueued: (media: MediaLibrarySelection, isQueued: boolean) => void,
  +sendMedia: (media: MediaLibrarySelection) => void,
  +isFocused: boolean,
  +setFocus: (media: MediaLibrarySelection, isFocused: boolean) => void,
  +dimensions: DimensionsInfo,
};
function MediaGalleryMedia(props: Props): React.Node {
  const {
    selection,
    containerHeight,
    queueModeActive,
    isQueued,
    setMediaQueued,
    sendMedia,
    isFocused,
    setFocus,
    dimensions,
  } = props;
  const focusProgress = useSharedValue(0);
  const checkProgress: AnimatedValue = React.useMemo(
    () => new Animated.Value(0),
    [],
  );

  const buttonsStyleAnimated: AnimatedStyleObj = useAnimatedStyle(() => {
    const buttonsScale = interpolate(focusProgress.value, [0, 1], [1.3, 1]);

    return {
      opacity: focusProgress.value,
      transform: [{ scale: buttonsScale }],
      marginBottom: dimensions.bottomInset,
    };
  });

  const buttonsStyle = React.useMemo(
    () => [buttonsStyleAnimated, styles.buttons],
    [buttonsStyleAnimated],
  );

  const mediaStyle: AnimatedStyleObj = useAnimatedStyle(() => {
    const mediaScale = interpolate(focusProgress.value, [0, 1], [1, 1.3]);
    return {
      transform: [{ scale: mediaScale }],
    };
  });

  const prevActivityStatus = React.useRef({
    isFocused: false,
    isQueued: false,
  });

  React.useEffect(() => {
    const isActive = isFocused || isQueued;
    const wasActive =
      prevActivityStatus.current.isFocused ||
      prevActivityStatus.current.isQueued;

    if (isActive && !wasActive) {
      focusProgress.value = withTiming(1, reanimatedSpec);
    } else if (!isActive && wasActive) {
      focusProgress.value = withTiming(0, reanimatedSpec);
    }

    if (isQueued && !prevActivityStatus.current.isQueued) {
      // When I updated to React Native 0.60, I also updated Lottie. At that
      // time, on iOS the last frame of the animation drops the circle outlining
      // the checkmark. This is a hack to get around that
      const maxValue = Platform.OS === 'ios' ? 0.99 : 1;
      Animated.timing(checkProgress, {
        ...animatedSpec,
        toValue: maxValue,
      }).start();
    } else if (!isQueued && prevActivityStatus.current.isQueued) {
      Animated.timing(checkProgress, {
        ...animatedSpec,
        toValue: 0,
      }).start();
    }

    prevActivityStatus.current = {
      isFocused: isFocused,
      isQueued: isQueued,
    };
  }, [checkProgress, focusProgress, isFocused, isQueued]);

  const onPressBackdrop = React.useCallback(() => {
    if (isQueued) {
      setMediaQueued(selection, false);
    } else if (queueModeActive) {
      setMediaQueued(selection, true);
    } else {
      setFocus(selection, !isFocused);
    }
  }, [
    isQueued,
    queueModeActive,
    setMediaQueued,
    selection,
    setFocus,
    isFocused,
  ]);

  const onPressSend = React.useCallback(() => {
    sendMedia(selection);
  }, [selection, sendMedia]);

  const onPressEnqueue = React.useCallback(() => {
    setMediaQueued(selection, true);
  }, [selection, setMediaQueued]);

  const {
    uri,
    dimensions: { width, height },
    step,
  } = selection;
  const active = isFocused || isQueued;

  const dimensionsStyle: { +height: number, +width: number } =
    React.useMemo(() => {
      const scaledWidth = height ? (width * containerHeight) / height : 0;

      return {
        height: containerHeight,
        width: Math.max(Math.min(scaledWidth, width), 150),
      };
    }, [containerHeight, height, width]);

  let buttons = null;
  if (!queueModeActive) {
    buttons = (
      <>
        <TouchableOpacity
          onPress={onPressSend}
          style={styles.sendButton}
          activeOpacity={0.6}
          disabled={!active}
        >
          <Icon name="send" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onPressEnqueue}
          style={styles.enqueueButton}
          activeOpacity={0.6}
          disabled={!active}
        >
          <MaterialIcon name="add-to-photos" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Queue</Text>
        </TouchableOpacity>
      </>
    );
  }

  const animatedImageStyle = React.useMemo(
    () => [mediaStyle, dimensionsStyle],
    [dimensionsStyle, mediaStyle],
  );

  const videoRef = React.useRef(null);

  // https://github.com/TheWidlarzGroup/react-native-video/issues/4497
  const onVideoEnd = React.useCallback(() => {
    videoRef.current?.seek(0);
  }, []);

  let media;
  const source = { uri };
  if (step === 'video_library') {
    let resizeMode = 'contain';
    if (Platform.OS === 'ios') {
      const [major, minor] = Platform.Version.split('.');
      if (parseInt(major, 10) === 14 && parseInt(minor, 10) < 2) {
        resizeMode = 'stretch';
      }
    }
    media = (
      <AnimatedView style={mediaStyle}>
        <Video
          ref={videoRef}
          source={source}
          repeat={false}
          muted={true}
          resizeMode={resizeMode}
          style={dimensionsStyle}
          onEnd={onVideoEnd}
          disableFocus={true}
        />
      </AnimatedView>
    );
  } else {
    media = <AnimatedImage source={source} style={animatedImageStyle} />;
  }

  const overlay = (
    <AnimatedView style={buttonsStyle}>
      <AnimatedLottieView
        source={require('../animations/check.json')}
        progress={checkProgress}
        style={styles.checkAnimation}
        resizeMode="cover"
      />
    </AnimatedView>
  );

  const containerStyle = React.useMemo(
    () => [styles.container, dimensionsStyle],
    [dimensionsStyle],
  );

  return (
    <View style={containerStyle}>
      <GestureTouchableOpacity
        onPress={onPressBackdrop}
        overlay={overlay}
        stickyActive={active}
      >
        {media}
      </GestureTouchableOpacity>
      <AnimatedView
        style={buttonsStyle}
        pointerEvents={active ? 'box-none' : 'none'}
      >
        {buttons}
      </AnimatedView>
    </View>
  );
}

const buttonStyle = {
  flexDirection: 'row',
  alignItems: 'flex-start',
  margin: 10,
  borderRadius: 20,
  paddingLeft: 20,
  paddingRight: 20,
  paddingTop: 10,
  paddingBottom: 10,
};
const styles = StyleSheet.create({
  buttonIcon: {
    alignSelf: Platform.OS === 'android' ? 'center' : 'flex-end',
    color: 'white',
    fontSize: 18,
    marginRight: 6,
    paddingRight: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  buttons: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  checkAnimation: {
    position: 'absolute',
    width: 128,
  },
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  enqueueButton: {
    ...buttonStyle,
    backgroundColor: '#2A78E5',
  },
  sendButton: {
    ...buttonStyle,
    backgroundColor: '#7ED321',
    paddingLeft: 18,
  },
});

export default MediaGalleryMedia;
