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
} from '../input/input-state';
import {
  type MessageListNavProp,
  messageListNavPropType,
} from './message-list-types';
import {
  type ScrollViewModalState,
  scrollViewModalStatePropType,
  withScrollViewModalState,
} from '../navigation/scroll-view-modal-state';
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
import invariant from 'invariant';

import { messageKey } from 'lib/shared/message-utils';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import { connect } from 'lib/utils/redux-utils';

import InlineMultimedia from './inline-multimedia.react';
import { multimediaTooltipHeight } from './multimedia-tooltip-modal.react';
import { type Colors, colorsPropType, colorsSelector } from '../themes/colors';
import {
  withOverlayContext,
  type OverlayContextType,
  overlayContextPropType,
} from '../navigation/overlay-context';

/* eslint-disable import/no-named-as-default-member */
const {
  Value,
  set,
  block,
  cond,
  eq,
  greaterThan,
  and,
  sub,
  multiply,
  interpolate,
  Extrapolate,
} = Animated;
/* eslint-enable import/no-named-as-default-member */

function overlayJustCleared(overlayPosition: Value) {
  const justCleared = new Value(0);
  const prevValue = new Value(0);
  return [
    set(justCleared, and(greaterThan(prevValue, 0), eq(overlayPosition, 0))),
    set(prevValue, overlayPosition),
    justCleared,
  ];
}

type Props = {|
  mediaInfo: MediaInfo,
  item: ChatMultimediaMessageInfoItem,
  navigation: MessageListNavProp,
  verticalBounds: ?VerticalBounds,
  verticalOffset: number,
  style: ImageStyle,
  postInProgress: boolean,
  pendingUpload: ?PendingMultimediaUpload,
  messageFocused: boolean,
  toggleMessageFocus: (messageKey: string) => void,
  // Redux state
  colors: Colors,
  // withScrollViewModalState
  scrollViewModalState: ?ScrollViewModalState,
  // withKeyboardState
  keyboardState: ?KeyboardState,
  // withOverlayContext
  overlayContext: ?OverlayContextType,
|};
class MultimediaMessageMultimedia extends React.PureComponent<Props> {
  static propTypes = {
    mediaInfo: mediaInfoPropType.isRequired,
    item: chatMessageItemPropType.isRequired,
    navigation: messageListNavPropType.isRequired,
    verticalBounds: verticalBoundsPropType,
    verticalOffset: PropTypes.number.isRequired,
    postInProgress: PropTypes.bool.isRequired,
    pendingUpload: pendingMultimediaUploadPropType,
    messageFocused: PropTypes.bool.isRequired,
    toggleMessageFocus: PropTypes.func.isRequired,
    colors: colorsPropType.isRequired,
    scrollViewModalState: scrollViewModalStatePropType,
    keyboardState: keyboardStatePropType,
    overlayContext: overlayContextPropType,
  };
  view: ?View;
  clickable = true;
  hidden = new Value(0);
  opacity: Value;

  constructor(props: Props) {
    super(props);
    this.getOpacity();
  }

  static getOverlayPosition(props: Props) {
    const { overlayContext } = props;
    invariant(
      overlayContext,
      'MultimediaMessageMultimedia should have OverlayContext',
    );
    return overlayContext.position;
  }

  getOpacity() {
    const overlayPosition = MultimediaMessageMultimedia.getOverlayPosition(
      this.props,
    );
    if (!overlayPosition) {
      return;
    }
    this.opacity = block([
      cond(overlayJustCleared(overlayPosition), set(this.hidden, 0)),
      sub(
        1,
        multiply(
          this.hidden,
          interpolate(overlayPosition, {
            inputRange: [0.1, 0.11],
            outputRange: [0, 1],
            extrapolate: Extrapolate.CLAMP,
          }),
        ),
      ),
    ]);
  }

  static scrollDisabled(props: Props) {
    const { scrollViewModalState } = props;
    return (
      !!scrollViewModalState && scrollViewModalState.modalState !== 'closed'
    );
  }

  componentDidUpdate(prevProps: Props) {
    const overlayPosition = MultimediaMessageMultimedia.getOverlayPosition(
      this.props,
    );
    const prevOverlayPosition = MultimediaMessageMultimedia.getOverlayPosition(
      prevProps,
    );
    if (overlayPosition !== prevOverlayPosition) {
      this.getOpacity();
    }

    const scrollIsDisabled = MultimediaMessageMultimedia.scrollDisabled(
      this.props,
    );
    const scrollWasDisabled = MultimediaMessageMultimedia.scrollDisabled(
      prevProps,
    );
    if (!scrollIsDisabled && scrollWasDisabled) {
      this.clickable = true;
      this.hidden.setValue(0);
    }
  }

  render() {
    const { opacity } = this;
    const wrapperStyles = [styles.container, { opacity }, this.props.style];

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

    const { scrollViewModalState, mediaInfo, item } = this.props;
    if (scrollViewModalState) {
      scrollViewModalState.setModalState('open');
    }

    view.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };
      this.props.navigation.navigate({
        routeName: MultimediaModalRouteName,
        params: {
          presentedFrom: this.props.navigation.state.key,
          mediaInfo,
          item,
          initialCoordinates: coordinates,
          verticalBounds,
        },
      });
      this.hidden.setValue(1);
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

    const { scrollViewModalState } = this.props;
    if (scrollViewModalState) {
      scrollViewModalState.setModalState('open');
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
  withOverlayContext(
    withKeyboardState(withScrollViewModalState(MultimediaMessageMultimedia)),
  ),
);
