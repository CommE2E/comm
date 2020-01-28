// @flow

import {
  mediaTypePropType,
  type Dimensions,
  dimensionsPropType,
} from 'lib/types/media-types';
import type { ViewStyle, ImageStyle } from '../types/styles';
import { type Colors, colorsPropType } from '../themes/colors';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import LottieView from 'lottie-react-native';
import
  GenericTouchable,
  { TOUCHABLE_STATE }
from 'react-native-gesture-handler/touchables/GenericTouchable';
import
  Reanimated,
  { Easing as ReanimatedEasing }
from 'react-native-reanimated';
import invariant from 'invariant';
import Video from 'react-native-video';

export type GalleryMediaInfo =
  | {|
      type: "photo",
      uri: string,
      dimensions: Dimensions,
    |}
  | {|
      type: "video",
      uri: string,
      dimensions: Dimensions,
      filename: string,
    |};
const animatedSpec = {
  duration: 400,
  easing: Easing.inOut(Easing.ease),
  useNativeDriver: true,
};
const reanimatedSpec = {
  duration: 400,
  easing: ReanimatedEasing.inOut(ReanimatedEasing.ease),
};

type Props = {|
  mediaInfo: GalleryMediaInfo,
  containerHeight: number,
  queueModeActive: bool,
  isQueued: bool,
  setMediaQueued: (media: GalleryMediaInfo, isQueued: bool) => void,
  sendMedia: (media: GalleryMediaInfo) => void,
  isFocused: bool,
  setFocus: (media: GalleryMediaInfo, isFocused: bool) => void,
  screenWidth: number,
  colors: Colors,
|};
class MediaGalleryMedia extends React.PureComponent<Props> {

  static propTypes = {
    mediaInfo: PropTypes.shape({
      dimensions: dimensionsPropType.isRequired,
      type: mediaTypePropType.isRequired,
      uri: PropTypes.string.isRequired,
      filename: PropTypes.string,
    }).isRequired,
    containerHeight: PropTypes.number.isRequired,
    queueModeActive: PropTypes.bool.isRequired,
    isQueued: PropTypes.bool.isRequired,
    setMediaQueued: PropTypes.func.isRequired,
    sendMedia: PropTypes.func.isRequired,
    isFocused: PropTypes.bool.isRequired,
    setFocus: PropTypes.func.isRequired,
    screenWidth: PropTypes.number.isRequired,
    colors: colorsPropType.isRequired,
  };
  focusProgress = new Reanimated.Value(0);
  buttonsStyle: ViewStyle;
  backdropProgress = new Reanimated.Value(0);
  animatingBackdropToZero = false;
  imageStyle: ImageStyle;
  videoContainerStyle: ViewStyle;
  videoOverlayStyle: ViewStyle;
  checkProgress = new Animated.Value(0);

  constructor(props: Props) {
    super(props);

    const buttonsScale = Reanimated.interpolate(
      this.focusProgress,
      {
        inputRange: [ 0, 1 ],
        outputRange: [ 1.3, 1 ],
      },
    );
    this.buttonsStyle = {
      ...styles.buttons,
      opacity: this.focusProgress,
      transform: [
        { scale: buttonsScale },
      ],
    };

    const mediaScale = Reanimated.interpolate(
      this.focusProgress,
      {
        inputRange: [ 0, 1 ],
        outputRange: [ 1, 1.3 ],
      },
    );
    this.videoContainerStyle = {
      transform: [
        { scale: mediaScale },
      ],
    };

    const backdropOpacity = Reanimated.interpolate(
      this.backdropProgress,
      {
        inputRange: [ 0, 1 ],
        outputRange: [ 1, 0.2 ],
      },
    );
    this.imageStyle = {
      opacity: backdropOpacity,
      transform: [
        { scale: mediaScale },
      ],
    };

    const overlayOpacity = Reanimated.interpolate(
      this.backdropProgress,
      {
        inputRange: [ 0, 1 ],
        outputRange: [ 0, 0.8 ],
      },
    );
    this.videoOverlayStyle = {
      ...styles.videoOverlay,
      opacity: overlayOpacity,
      backgroundColor: props.colors.listBackground,
    };
  }

  static isActive(props: Props) {
    return props.isFocused || props.isQueued;
  }

  componentDidUpdate(prevProps: Props) {
    const animations = [];

    const isActive = MediaGalleryMedia.isActive(this.props);
    const wasActive = MediaGalleryMedia.isActive(prevProps);
    const { backdropProgress } = this;
    if (isActive && !wasActive) {
      if (backdropProgress) {
        Reanimated.timing(
          backdropProgress,
          { ...reanimatedSpec, toValue: 1 },
        ).start();
      }
      Reanimated.timing(
        this.focusProgress,
        { ...reanimatedSpec, toValue: 1 },
      ).start();
    } else if (!isActive && wasActive) {
      if (backdropProgress && !this.animatingBackdropToZero) {
        this.animatingBackdropToZero = true;
        Reanimated.timing(
          backdropProgress,
          { ...reanimatedSpec, toValue: 0 },
        ).start(this.onAnimatingBackdropToZeroCompletion);
      }
      Reanimated.timing(
        this.focusProgress,
        { ...reanimatedSpec, toValue: 0 },
      ).start();
    }

    if (this.props.isQueued && !prevProps.isQueued) {
      // When I updated to React Native 0.60, I also updated Lottie. At that
      // time, on iOS the last frame of the animation drops the circle outlining
      // the checkmark. This is a hack to get around that
      const maxValue = Platform.OS === "ios" ? 0.99 : 1;
      Animated.timing(
        this.checkProgress,
        { ...animatedSpec, toValue: 0.99 },
      ).start();
    } else if (!this.props.isQueued && prevProps.isQueued) {
      Animated.timing(
        this.checkProgress,
        { ...animatedSpec, toValue: 0 },
      ).start();
    }
  }

  render() {
    const { mediaInfo, containerHeight } = this.props;
    const { uri, dimensions: { width, height }, type } = mediaInfo;
    const active = MediaGalleryMedia.isActive(this.props);
    const dimensionsStyle = {
      height: containerHeight,
      width: Math.max(
        Math.min(
          width / height * containerHeight,
          this.props.screenWidth,
        ),
        150,
      ),
    };

    let buttons = null;
    const { queueModeActive, isQueued } = this.props;
    if (!queueModeActive) {
      buttons = (
        <React.Fragment>
          <TouchableOpacity
            onPress={this.onPressSend}
            style={styles.sendButton}
            activeOpacity={0.6}
            disabled={!active}
          >
            <Icon name="send" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>
              Send
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={this.onPressEnqueue}
            style={styles.enqueueButton}
            activeOpacity={0.6}
            disabled={!active}
          >
            <MaterialIcon name="add-to-photos" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>
              Queue
            </Text>
          </TouchableOpacity>
        </React.Fragment>
      );
    }

    let media;
    const source = { uri };
    if (type === "video") {
      media = (
        <Reanimated.View style={this.videoContainerStyle}>
          <Video
            source={source}
            repeat={true}
            muted={true}
            resizeMode="contain"
            style={dimensionsStyle}
          />
          <Reanimated.View style={this.videoOverlayStyle} />
        </Reanimated.View>
      );
    } else {
      media = (
        <Reanimated.Image
          source={source}
          style={[ this.imageStyle, dimensionsStyle ]}
        />
      );
    }

    return (
      <View style={[ styles.container, dimensionsStyle ]}>
        <GenericTouchable
          onPress={this.onPressBackdrop}
          onStateChange={this.onBackdropStateChange}
          delayPressOut={1}
        >
          {media}
          <Reanimated.View style={this.buttonsStyle}>
            <LottieView
              source={require('../animations/check.json')}
              progress={this.checkProgress}
              style={styles.checkAnimation}
              resizeMode="cover"
            />
          </Reanimated.View>
        </GenericTouchable>
        <Reanimated.View
          style={this.buttonsStyle}
          pointerEvents={active ? "box-none" : "none"}
        >
          {buttons}
        </Reanimated.View>
      </View>
    );
  }

  onPressBackdrop = () => {
    if (this.props.isQueued) {
      this.props.setMediaQueued(this.props.mediaInfo, false);
    } else if (this.props.queueModeActive) {
      this.props.setMediaQueued(this.props.mediaInfo, true);
    } else {
      this.props.setFocus(this.props.mediaInfo, !this.props.isFocused);
    }
  }

  onBackdropStateChange = (from: number, to: number) => {
    if (MediaGalleryMedia.isActive(this.props)) {
      return;
    }
    const { backdropProgress } = this;
    invariant(backdropProgress, "should be set");
    if (to === TOUCHABLE_STATE.BEGAN) {
      backdropProgress.setValue(1);
    } else if (
      !this.animatingBackdropToZero &&
      (to === TOUCHABLE_STATE.UNDETERMINED ||
        to === TOUCHABLE_STATE.MOVED_OUTSIDE)
    ) {
      this.animatingBackdropToZero = true;
      Reanimated.timing(
        backdropProgress,
        { ...reanimatedSpec, duration: 150, toValue: 0 },
      ).start(this.onAnimatingBackdropToZeroCompletion);
    }
  }

  onPressSend = () => {
    this.props.sendMedia(this.props.mediaInfo);
  }

  onPressEnqueue = () => {
    this.props.setMediaQueued(this.props.mediaInfo, true);
  }

  onAnimatingBackdropToZeroCompletion = ({ finished }: { finished: bool }) => {
    this.animatingBackdropToZero = false;
  }

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
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  buttons: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    ...buttonStyle,
    backgroundColor: '#7ED321',
    paddingLeft: 18,
  },
  enqueueButton: {
    ...buttonStyle,
    backgroundColor: '#2A78E5',
  },
  buttonIcon: {
    alignSelf: Platform.OS === "android" ? 'center' : 'flex-end',
    marginRight: 6,
    color: 'white',
    fontSize: 18,
    paddingRight: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  checkAnimation: {
    position: 'absolute',
    width: 128,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default MediaGalleryMedia;
