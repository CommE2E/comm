// @flow

import { type MediaInfo, mediaInfoPropType } from 'lib/types/media-types';
import type { ImageStyle } from '../types/styles';
import {
  type Navigate,
  MultimediaModalRouteName,
  MultimediaTooltipModalRouteName,
} from '../navigation/route-names';
import {
  type VerticalBounds,
  verticalBoundsPropType,
} from '../types/lightbox-types';
import {
  type PendingMultimediaUpload,
  pendingMultimediaUploadPropType,
} from './chat-input-state';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { KeyboardUtils } from 'react-native-keyboard-input';
import invariant from 'invariant';

import InlineMultimedia from './inline-multimedia.react';
import { multimediaTooltipHeight } from './multimedia-tooltip-modal.react';

type Props = {|
  mediaInfo: MediaInfo,
  navigate: Navigate,
  verticalBounds: ?VerticalBounds,
  verticalOffset: number,
  style: ImageStyle,
  scrollDisabled: bool,
  lightboxPosition: ?Animated.Value,
  postInProgress: bool,
  pendingUpload: ?PendingMultimediaUpload,
  keyboardShowing: bool,
  messageFocused: bool,
  toggleMessageFocus: (messageKey: string) => void,
  setScrollDisabled: (scrollDisabled: bool) => void,
|};
type State = {|
  hidden: bool,
  opacity: ?Animated.Value,
|};
class MultimediaMessageMultimedia extends React.PureComponent<Props, State> {

  static propTypes = {
    mediaInfo: mediaInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    verticalBounds: verticalBoundsPropType,
    verticalOffset: PropTypes.number.isRequired,
    scrollDisabled: PropTypes.bool.isRequired,
    lightboxPosition: PropTypes.instanceOf(Animated.Value),
    postInProgress: PropTypes.bool.isRequired,
    pendingUpload: pendingMultimediaUploadPropType,
    keyboardShowing: PropTypes.bool.isRequired,
    messageFocused: PropTypes.bool.isRequired,
    toggleMessageFocus: PropTypes.func.isRequired,
    setScrollDisabled: PropTypes.func.isRequired,
  };
  view: ?View;
  clickable = true;

  constructor(props: Props) {
    super(props);
    this.state = {
      hidden: false,
      opacity: this.getOpacity(),
    };
  }

  static getDerivedStateFromProps(props: Props, state: State) {
    if (!props.scrollDisabled && state.hidden) {
      return { hidden: false };
    }
    return null;
  }

  getOpacity() {
    const { lightboxPosition } = this.props;
    if (!lightboxPosition) {
      return null;
    }
    return Animated.interpolate(
      this.props.lightboxPosition,
      {
        inputRange: [ 0.1, 0.11 ],
        outputRange: [ 1, 0 ],
        extrapolate: Animated.Extrapolate.CLAMP,
      },
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.lightboxPosition !== prevProps.lightboxPosition) {
      this.setState({ opacity: this.getOpacity() });
    }

    if (!this.props.scrollDisabled && prevProps.scrollDisabled) {
      this.clickable = true;
    }
  }

  render() {
    const wrapperStyles = [ styles.container ];
    if (this.state.hidden && this.state.opacity) {
      wrapperStyles.push({ opacity: this.state.opacity });
    }
    wrapperStyles.push(this.props.style);

    const { mediaInfo, pendingUpload, style, postInProgress } = this.props;
    return (
      <Animated.View style={wrapperStyles}>
        <View style={styles.expand} onLayout={this.onLayout} ref={this.viewRef}>
          <InlineMultimedia
            mediaInfo={this.props.mediaInfo}
            onPress={this.onPress}
            onLongPress={this.onLongPress}
            postInProgress={this.props.postInProgress}
            pendingUpload={this.props.pendingUpload}
          />
        </View>
      </Animated.View>
    );
  }

  onLayout = () => {}

  viewRef = (view: ?View) => {
    this.view = view;
  }

  onPress = () => {
    if (this.props.keyboardShowing) {
      KeyboardUtils.dismiss();
      return;
    }

    const { view, props: { verticalBounds } } = this;
    if (!view || !verticalBounds) {
      return;
    }

    if (!this.clickable) {
      return;
    }
    this.clickable = false;

    const { setScrollDisabled, mediaInfo } = this.props;
    setScrollDisabled(true);

    view.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };
      this.props.navigate({
        routeName: MultimediaModalRouteName,
        params: { mediaInfo, initialCoordinates: coordinates, verticalBounds },
      });
      this.setState({ hidden: true });
    });
  }

  onLongPress = () => {
    if (this.props.keyboardShowing) {
      KeyboardUtils.dismiss();
      return;
    }

    const { view, props: { verticalBounds } } = this;
    if (!view || !verticalBounds) {
      return;
    }

    if (!this.clickable) {
      return;
    }
    this.clickable = false;

    const {
      messageFocused,
      toggleMessageFocus,
      setScrollDisabled,
      mediaInfo,
      verticalOffset,
    } = this.props;
    if (!messageFocused) {
      toggleMessageFocus(mediaInfo.messageKey);
    }
    setScrollDisabled(true);

    view.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };

      const multimediaTop = pageY;
      const multimediaBottom = pageY + height;
      const boundsTop = verticalBounds.y;
      const boundsBottom = verticalBounds.y + verticalBounds.height;

      const belowMargin = 20;
      const belowSpace = multimediaTooltipHeight + belowMargin;
      const aboveMargin = verticalOffset === 0 ? 30 : 20;
      const aboveSpace = multimediaTooltipHeight + aboveMargin;

      let location = 'below', margin = belowMargin;
      if (
        multimediaBottom + belowSpace > boundsBottom &&
        multimediaTop - aboveSpace > boundsTop
      ) {
        location = 'above';
        margin = aboveMargin;
      }

      this.props.navigate({
        routeName: MultimediaTooltipModalRouteName,
        params: {
          mediaInfo,
          initialCoordinates: coordinates,
          verticalOffset,
          verticalBounds,
          location,
          margin,
        },
      });
    });
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  expand: {
    flex: 1,
  },
});

export default MultimediaMessageMultimedia;
