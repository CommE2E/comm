// @flow

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
import Reanimated, {
  EasingNode as ReanimatedEasing,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';

import { type MediaLibrarySelection } from 'lib/types/media-types';

import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react';
import { type DimensionsInfo } from '../redux/dimensions-updater.react';
import type { AnimatedValue } from '../types/react-native';
import {
  AnimatedView,
  AnimatedImage,
  type AnimatedViewStyle,
  type AnimatedStyleObj,
} from '../types/styles';

const animatedSpec = {
  duration: 400,
  easing: Easing.inOut(Easing.ease),
  useNativeDriver: true,
};
const reanimatedSpec = {
  duration: 400,
  easing: ReanimatedEasing.inOut(ReanimatedEasing.ease),
};

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
class MediaGalleryMedia extends React.PureComponent<Props> {
  // eslint-disable-next-line import/no-named-as-default-member
  focusProgress: Reanimated.Value = new Reanimated.Value(0);
  buttonsStyle: AnimatedViewStyle;
  mediaStyle: AnimatedStyleObj;
  checkProgress: AnimatedValue = new Animated.Value(0);

  constructor(props: Props) {
    super(props);

    // eslint-disable-next-line import/no-named-as-default-member
    const buttonsScale = Reanimated.interpolateNode(this.focusProgress, {
      inputRange: [0, 1],
      outputRange: [1.3, 1],
    });
    this.buttonsStyle = {
      ...styles.buttons,
      opacity: this.focusProgress,
      transform: [{ scale: buttonsScale }],
      marginBottom: this.props.dimensions.bottomInset,
    };

    // eslint-disable-next-line import/no-named-as-default-member
    const mediaScale = Reanimated.interpolateNode(this.focusProgress, {
      inputRange: [0, 1],
      outputRange: [1, 1.3],
    });
    this.mediaStyle = {
      transform: [{ scale: mediaScale }],
    };
  }

  static isActive(props: Props): boolean {
    return props.isFocused || props.isQueued;
  }

  componentDidUpdate(prevProps: Props) {
    const isActive = MediaGalleryMedia.isActive(this.props);
    const wasActive = MediaGalleryMedia.isActive(prevProps);
    if (isActive && !wasActive) {
      // eslint-disable-next-line import/no-named-as-default-member
      Reanimated.timing(this.focusProgress, {
        ...reanimatedSpec,
        toValue: 1,
      }).start();
    } else if (!isActive && wasActive) {
      // eslint-disable-next-line import/no-named-as-default-member
      Reanimated.timing(this.focusProgress, {
        ...reanimatedSpec,
        toValue: 0,
      }).start();
    }

    if (this.props.isQueued && !prevProps.isQueued) {
      // When I updated to React Native 0.60, I also updated Lottie. At that
      // time, on iOS the last frame of the animation drops the circle outlining
      // the checkmark. This is a hack to get around that
      const maxValue = Platform.OS === 'ios' ? 0.99 : 1;
      Animated.timing(this.checkProgress, {
        ...animatedSpec,
        toValue: maxValue,
      }).start();
    } else if (!this.props.isQueued && prevProps.isQueued) {
      Animated.timing(this.checkProgress, {
        ...animatedSpec,
        toValue: 0,
      }).start();
    }
  }

  render(): React.Node {
    const { selection, containerHeight } = this.props;
    const {
      uri,
      dimensions: { width, height },
      step,
    } = selection;
    const active = MediaGalleryMedia.isActive(this.props);
    const scaledWidth = height ? (width * containerHeight) / height : 0;
    const dimensionsStyle: { +height: number, +width: number } = {
      height: containerHeight,
      width: Math.max(Math.min(scaledWidth, this.props.dimensions.width), 150),
    };

    let buttons = null;
    const { queueModeActive } = this.props;
    if (!queueModeActive) {
      buttons = (
        <>
          <TouchableOpacity
            onPress={this.onPressSend}
            style={styles.sendButton}
            activeOpacity={0.6}
            disabled={!active}
          >
            <Icon name="send" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={this.onPressEnqueue}
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
        <AnimatedView style={this.mediaStyle}>
          <Video
            source={source}
            repeat={true}
            muted={true}
            resizeMode={resizeMode}
            style={dimensionsStyle}
          />
        </AnimatedView>
      );
    } else {
      media = (
        <AnimatedImage
          source={source}
          style={[this.mediaStyle, dimensionsStyle]}
        />
      );
    }

    const overlay = (
      <AnimatedView style={this.buttonsStyle}>
        <LottieView
          source={require('../animations/check.json')}
          progress={this.checkProgress}
          style={styles.checkAnimation}
          resizeMode="cover"
        />
      </AnimatedView>
    );

    return (
      <View style={[styles.container, dimensionsStyle]}>
        <GestureTouchableOpacity
          onPress={this.onPressBackdrop}
          overlay={overlay}
          stickyActive={active}
        >
          {media}
        </GestureTouchableOpacity>
        <AnimatedView
          style={this.buttonsStyle}
          pointerEvents={active ? 'box-none' : 'none'}
        >
          {buttons}
        </AnimatedView>
      </View>
    );
  }

  onPressBackdrop: () => void = () => {
    if (this.props.isQueued) {
      this.props.setMediaQueued(this.props.selection, false);
    } else if (this.props.queueModeActive) {
      this.props.setMediaQueued(this.props.selection, true);
    } else {
      this.props.setFocus(this.props.selection, !this.props.isFocused);
    }
  };

  onPressSend: () => void = () => {
    this.props.sendMedia(this.props.selection);
  };

  onPressEnqueue: () => void = () => {
    this.props.setMediaQueued(this.props.selection, true);
  };
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
