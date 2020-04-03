// @flow

import { type MediaInfo, mediaInfoPropType } from 'lib/types/media-types';
import type { ChatMultimediaMessageInfoItem } from './multimedia-message.react';
import type { ImageStyle } from '../types/styles';
import {
  MultimediaModalRouteName,
  MultimediaTooltipModalRouteName,
} from '../navigation/route-names';
import {
  type VerticalBounds,
  verticalBoundsPropType,
} from '../types/layout-types';
import {
  type PendingMultimediaUpload,
  pendingMultimediaUploadPropType,
} from './chat-input-state';
import {
  type MessageListNavProp,
  messageListNavPropType,
} from './message-list-types';
import {
  type OverlayableScrollViewState,
  overlayableScrollViewStatePropType,
  withOverlayableScrollViewState,
} from '../navigation/overlayable-scroll-view-state';
import {
  type KeyboardState,
  keyboardStatePropType,
  withKeyboardState,
} from '../keyboard/keyboard-state';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { messageKey } from 'lib/shared/message-utils';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import { connect } from 'lib/utils/redux-utils';

import InlineMultimedia from './inline-multimedia.react';
import { multimediaTooltipHeight } from './multimedia-tooltip-modal.react';
import { type Colors, colorsPropType, colorsSelector } from '../themes/colors';

type Props = {|
  mediaInfo: MediaInfo,
  item: ChatMultimediaMessageInfoItem,
  navigation: MessageListNavProp,
  verticalBounds: ?VerticalBounds,
  verticalOffset: number,
  style: ImageStyle,
  overlayPosition: ?Animated.Value,
  postInProgress: boolean,
  pendingUpload: ?PendingMultimediaUpload,
  messageFocused: boolean,
  toggleMessageFocus: (messageKey: string) => void,
  // Redux state
  colors: Colors,
  // withOverlayableScrollViewState
  overlayableScrollViewState: ?OverlayableScrollViewState,
  // withKeyboardState
  keyboardState: ?KeyboardState,
|};
type State = {|
  hidden: boolean,
  opacity: ?Animated.Value,
|};
class MultimediaMessageMultimedia extends React.PureComponent<Props, State> {
  static propTypes = {
    mediaInfo: mediaInfoPropType.isRequired,
    item: chatMessageItemPropType.isRequired,
    navigation: messageListNavPropType.isRequired,
    verticalBounds: verticalBoundsPropType,
    verticalOffset: PropTypes.number.isRequired,
    overlayPosition: PropTypes.instanceOf(Animated.Value),
    postInProgress: PropTypes.bool.isRequired,
    pendingUpload: pendingMultimediaUploadPropType,
    messageFocused: PropTypes.bool.isRequired,
    toggleMessageFocus: PropTypes.func.isRequired,
    colors: colorsPropType.isRequired,
    overlayableScrollViewState: overlayableScrollViewStatePropType,
    keyboardState: keyboardStatePropType,
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
    const scrollIsDisabled = MultimediaMessageMultimedia.scrollDisabled(props);
    if (!scrollIsDisabled && state.hidden) {
      return { hidden: false };
    }
    return null;
  }

  getOpacity() {
    const { overlayPosition } = this.props;
    if (!overlayPosition) {
      return null;
    }
    return Animated.interpolate(this.props.overlayPosition, {
      inputRange: [0.1, 0.11],
      outputRange: [1, 0],
      extrapolate: Animated.Extrapolate.CLAMP,
    });
  }

  static scrollDisabled(props: Props) {
    const { overlayableScrollViewState } = props;
    return !!(
      overlayableScrollViewState && overlayableScrollViewState.scrollDisabled
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.overlayPosition !== prevProps.overlayPosition) {
      this.setState({ opacity: this.getOpacity() });
    }

    const scrollIsDisabled = MultimediaMessageMultimedia.scrollDisabled(
      this.props,
    );
    const scrollWasDisabled = MultimediaMessageMultimedia.scrollDisabled(
      prevProps,
    );
    if (!scrollIsDisabled && scrollWasDisabled) {
      this.clickable = true;
    }
  }

  render() {
    const wrapperStyles = [styles.container];
    if (this.state.hidden && this.state.opacity) {
      wrapperStyles.push({ opacity: this.state.opacity });
    }
    wrapperStyles.push(this.props.style);

    const { mediaInfo, pendingUpload, postInProgress } = this.props;
    return (
      <Animated.View style={wrapperStyles}>
        <View style={styles.expand} onLayout={this.onLayout} ref={this.viewRef}>
          <InlineMultimedia
            mediaInfo={mediaInfo}
            onPress={this.onPress}
            onLongPress={this.onLongPress}
            postInProgress={postInProgress}
            pendingUpload={pendingUpload}
            spinnerColor={this.props.colors.listSeparatorLabel}
          />
        </View>
      </Animated.View>
    );
  }

  onLayout = () => {};

  viewRef = (view: ?View) => {
    this.view = view;
  };

  onPress = () => {
    if (this.dismissKeyboardIfShowing()) {
      return;
    }

    const {
      view,
      props: { verticalBounds },
    } = this;
    if (!view || !verticalBounds) {
      return;
    }

    if (!this.clickable) {
      return;
    }
    this.clickable = false;

    const { overlayableScrollViewState, mediaInfo } = this.props;
    if (overlayableScrollViewState) {
      overlayableScrollViewState.setScrollDisabled(true);
    }

    view.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };
      this.props.navigation.navigate({
        routeName: MultimediaModalRouteName,
        params: {
          presentedFrom: this.props.navigation.state.key,
          mediaInfo,
          initialCoordinates: coordinates,
          verticalBounds,
        },
      });
      this.setState({ hidden: true });
    });
  };

  onLongPress = () => {
    if (this.dismissKeyboardIfShowing()) {
      return;
    }

    const {
      view,
      props: { verticalBounds },
    } = this;
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
      item,
      mediaInfo,
      verticalOffset,
    } = this.props;
    if (!messageFocused) {
      toggleMessageFocus(messageKey(item.messageInfo));
    }

    const { overlayableScrollViewState } = this.props;
    if (overlayableScrollViewState) {
      overlayableScrollViewState.setScrollDisabled(true);
    }

    view.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };

      const multimediaTop = pageY;
      const multimediaBottom = pageY + height;
      const boundsTop = verticalBounds.y;
      const boundsBottom = verticalBounds.y + verticalBounds.height;

      const belowMargin = 20;
      const belowSpace = multimediaTooltipHeight + belowMargin;
      const { isViewer } = item.messageInfo.creator;
      const directlyAboveMargin = isViewer ? 30 : 50;
      const aboveMargin = verticalOffset === 0 ? directlyAboveMargin : 20;
      const aboveSpace = multimediaTooltipHeight + aboveMargin;

      let location = 'below',
        margin = belowMargin;
      if (
        multimediaBottom + belowSpace > boundsBottom &&
        multimediaTop - aboveSpace > boundsTop
      ) {
        location = 'above';
        margin = aboveMargin;
      }

      this.props.navigation.navigate({
        routeName: MultimediaTooltipModalRouteName,
        params: {
          presentedFrom: this.props.navigation.state.key,
          mediaInfo,
          item,
          initialCoordinates: coordinates,
          verticalOffset,
          verticalBounds,
          location,
          margin,
        },
      });
    });
  };

  dismissKeyboardIfShowing = () => {
    const { keyboardState } = this.props;
    return !!(keyboardState && keyboardState.dismissKeyboardIfShowing());
  };
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

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
}))(
  withKeyboardState(
    withOverlayableScrollViewState(MultimediaMessageMultimedia),
  ),
);
