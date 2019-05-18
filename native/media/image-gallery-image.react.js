// @flow

import type { Dimensions } from 'lib/types/media-types';
import type { ViewStyle, ImageStyle } from '../types/styles';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Image,
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  Platform,
  TouchableWithoutFeedback,
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

export type GalleryImageInfo = {|
  ...Dimensions,
  uri: string,
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
const isAndroid44 = Platform.OS === "android" && Platform.Version < 21;

type Props = {|
  imageInfo: GalleryImageInfo,
  containerHeight: number,
  queueModeActive: bool,
  isQueued: bool,
  setImageQueued: (image: GalleryImageInfo, isQueued: bool) => void,
  sendImage: (image: GalleryImageInfo) => void,
  isFocused: bool,
  setFocus: (image: GalleryImageInfo, isFocused: bool) => void,
  screenWidth: number,
|};
class ImageGalleryImage extends React.PureComponent<Props> {

  static propTypes = {
    imageInfo: PropTypes.shape({
      height: PropTypes.number.isRequired,
      width: PropTypes.number.isRequired,
      uri: PropTypes.string.isRequired,
    }).isRequired,
    containerHeight: PropTypes.number.isRequired,
    queueModeActive: PropTypes.bool.isRequired,
    isQueued: PropTypes.bool.isRequired,
    setImageQueued: PropTypes.func.isRequired,
    sendImage: PropTypes.func.isRequired,
    isFocused: PropTypes.bool.isRequired,
    setFocus: PropTypes.func.isRequired,
    screenWidth: PropTypes.number.isRequired,
  };
  backdrop: ?TouchableOpacity;
  focusProgress = new Reanimated.Value(0);
  buttonsStyle: ViewStyle;
  backdropProgress: ?Reanimated.Value;
  animatingBackdropToZero = false;
  imageStyle: ImageStyle;
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

    const imageScale = Reanimated.interpolate(
      this.focusProgress,
      {
        inputRange: [ 0, 1 ],
        outputRange: [ 1, 1.3 ],
      },
    );
    if (isAndroid44) {
      this.imageStyle = {
        transform: [
          { scale: imageScale },
        ],
      };
    } else {
      this.backdropProgress = new Reanimated.Value(0);
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
          { scale: imageScale },
        ],
      };
    }
  }

  static isActive(props: Props) {
    return props.isFocused || props.isQueued;
  }

  componentDidUpdate(prevProps: Props) {
    const animations = [];

    const isActive = ImageGalleryImage.isActive(this.props);
    const wasActive = ImageGalleryImage.isActive(prevProps);
    const { backdrop, backdropProgress } = this;
    if (isActive && !wasActive) {
      if (backdropProgress) {
        Reanimated.timing(
          backdropProgress,
          { ...reanimatedSpec, toValue: 1 },
        ).start();
      }
      if (backdrop) {
        backdrop.setOpacityTo(0.2, 0);
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
      if (backdrop) {
        backdrop.setOpacityTo(1, 0);
      }
      Reanimated.timing(
        this.focusProgress,
        { ...reanimatedSpec, toValue: 0 },
      ).start();
    }

    if (this.props.isQueued && !prevProps.isQueued) {
      Animated.timing(
        this.checkProgress,
        { ...animatedSpec, toValue: 1 },
      ).start();
    } else if (!this.props.isQueued && prevProps.isQueued) {
      Animated.timing(
        this.checkProgress,
        { ...animatedSpec, toValue: 0 },
      ).start();
    }
  }

  render() {
    const { imageInfo, containerHeight } = this.props;
    const { uri, width, height } = imageInfo;
    const source = { uri };
    const active = ImageGalleryImage.isActive(this.props);
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

    const image = (
      <Reanimated.Image
        source={source}
        style={[ this.imageStyle, dimensionsStyle ]}
      />
    );
    const checkAnimation = (
      <LottieView
        source={require('../animations/check.json')}
        progress={this.checkProgress}
        style={styles.checkAnimation}
        resizeMode="cover"
      />
    );

    if (isAndroid44) {
      const backdropStyle = {
        opacity: active ? 0.2 : 1,
      };
      return (
        <View style={[ styles.container, dimensionsStyle ]}>
          <TouchableOpacity
            onPress={this.onPressBackdrop}
            style={backdropStyle}
            ref={this.backdropRef}
          >
            {image}
          </TouchableOpacity>
          <Reanimated.View style={this.buttonsStyle} pointerEvents="none">
            {checkAnimation}
          </Reanimated.View>
        </View>
      );
    }

    return (
      <View style={[ styles.container, dimensionsStyle ]}>
        <GenericTouchable
          onPress={this.onPressBackdrop}
          onStateChange={this.onBackdropStateChange}
          delayPressOut={1}
        >
          {image}
          <Reanimated.View style={this.buttonsStyle}>
            {checkAnimation}
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

  backdropRef = (backdrop: ?TouchableOpacity) => {
    this.backdrop = backdrop;
  }

  onPressBackdrop = () => {
    if (this.props.isQueued) {
      this.props.setImageQueued(this.props.imageInfo, false);
    } else if (this.props.queueModeActive) {
      this.props.setImageQueued(this.props.imageInfo, true);
    } else {
      this.props.setFocus(this.props.imageInfo, !this.props.isFocused);
    }
  }

  onBackdropStateChange = (from: number, to: number) => {
    if (ImageGalleryImage.isActive(this.props)) {
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
    this.props.sendImage(this.props.imageInfo);
  }

  onPressEnqueue = () => {
    this.props.setImageQueued(this.props.imageInfo, true);
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
});

export default ImageGalleryImage;
