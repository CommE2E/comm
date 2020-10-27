// @flow

import { type MediaInfo, mediaInfoPropType } from 'lib/types/media-types';
import type { ChatMultimediaMessageInfoItem } from './multimedia-message.react';
import type { ViewStyle } from '../types/styles';
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
  messageListRoutePropType,
  messageListNavPropType,
} from './message-list-types';
import type { ChatNavigationProp } from './chat.react';
import type { NavigationRoute } from '../navigation/route-names';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import invariant from 'invariant';

import { messageKey } from 'lib/shared/message-utils';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';

import InlineMultimedia from './inline-multimedia.react';
import { multimediaTooltipHeight } from './multimedia-tooltip-modal.react';
import { type Colors, colorsPropType, useColors } from '../themes/colors';
import {
  type KeyboardState,
  keyboardStatePropType,
  KeyboardContext,
} from '../keyboard/keyboard-state';
import {
  OverlayContext,
  type OverlayContextType,
  overlayContextPropType,
} from '../navigation/overlay-context';

/* eslint-disable import/no-named-as-default-member */
const { Value, sub, interpolate, Extrapolate } = Animated;
/* eslint-enable import/no-named-as-default-member */

type BaseProps = {|
  +mediaInfo: MediaInfo,
  +item: ChatMultimediaMessageInfoItem,
  +navigation: ChatNavigationProp<'MessageList'>,
  +route: NavigationRoute<'MessageList'>,
  +verticalBounds: ?VerticalBounds,
  +verticalOffset: number,
  +style: ViewStyle,
  +postInProgress: boolean,
  +pendingUpload: ?PendingMultimediaUpload,
  +messageFocused: boolean,
  +toggleMessageFocus: (messageKey: string) => void,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +colors: Colors,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
|};
type State = {|
  +opacity: number | Value,
|};
class MultimediaMessageMultimedia extends React.PureComponent<Props, State> {
  static propTypes = {
    mediaInfo: mediaInfoPropType.isRequired,
    item: chatMessageItemPropType.isRequired,
    navigation: messageListNavPropType.isRequired,
    route: messageListRoutePropType.isRequired,
    verticalBounds: verticalBoundsPropType,
    verticalOffset: PropTypes.number.isRequired,
    postInProgress: PropTypes.bool.isRequired,
    pendingUpload: pendingMultimediaUploadPropType,
    messageFocused: PropTypes.bool.isRequired,
    toggleMessageFocus: PropTypes.func.isRequired,
    colors: colorsPropType.isRequired,
    keyboardState: keyboardStatePropType,
    overlayContext: overlayContextPropType,
  };
  view: ?React.ElementRef<typeof View>;
  clickable = true;

  constructor(props: Props) {
    super(props);
    this.state = {
      opacity: this.getOpacity(),
    };
  }

  static getStableKey(props: Props) {
    const { item, mediaInfo } = props;
    return `multimedia|${messageKey(item.messageInfo)}|${mediaInfo.index}`;
  }

  static getOverlayContext(props: Props) {
    const { overlayContext } = props;
    invariant(
      overlayContext,
      'MultimediaMessageMultimedia should have OverlayContext',
    );
    return overlayContext;
  }

  static getModalOverlayPosition(props: Props) {
    const overlayContext = MultimediaMessageMultimedia.getOverlayContext(props);
    const { visibleOverlays } = overlayContext;
    for (let overlay of visibleOverlays) {
      if (
        overlay.routeName === MultimediaModalRouteName &&
        overlay.presentedFrom === props.route.key &&
        overlay.routeKey === MultimediaMessageMultimedia.getStableKey(props)
      ) {
        return overlay.position;
      }
    }
    return undefined;
  }

  getOpacity() {
    const overlayPosition = MultimediaMessageMultimedia.getModalOverlayPosition(
      this.props,
    );
    if (!overlayPosition) {
      return 1;
    }
    return sub(
      1,
      interpolate(overlayPosition, {
        inputRange: [0.1, 0.11],
        outputRange: [0, 1],
        extrapolate: Extrapolate.CLAMP,
      }),
    );
  }

  componentDidUpdate(prevProps: Props) {
    const overlayPosition = MultimediaMessageMultimedia.getModalOverlayPosition(
      this.props,
    );
    const prevOverlayPosition = MultimediaMessageMultimedia.getModalOverlayPosition(
      prevProps,
    );
    if (overlayPosition !== prevOverlayPosition) {
      this.setState({ opacity: this.getOpacity() });
    }

    const scrollIsDisabled =
      MultimediaMessageMultimedia.getOverlayContext(this.props)
        .scrollBlockingModalStatus !== 'closed';
    const scrollWasDisabled =
      MultimediaMessageMultimedia.getOverlayContext(prevProps)
        .scrollBlockingModalStatus !== 'closed';
    if (!scrollIsDisabled && scrollWasDisabled) {
      this.clickable = true;
    }
  }

  render() {
    const { opacity } = this.state;
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

  viewRef = (view: ?React.ElementRef<typeof View>) => {
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

    const overlayContext = MultimediaMessageMultimedia.getOverlayContext(
      this.props,
    );
    overlayContext.setScrollBlockingModalStatus('open');

    const { mediaInfo, item } = this.props;
    view.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };
      this.props.navigation.navigate({
        name: MultimediaModalRouteName,
        key: MultimediaMessageMultimedia.getStableKey(this.props),
        params: {
          presentedFrom: this.props.route.key,
          mediaInfo,
          item,
          initialCoordinates: coordinates,
          verticalBounds,
        },
      });
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

    const overlayContext = MultimediaMessageMultimedia.getOverlayContext(
      this.props,
    );
    overlayContext.setScrollBlockingModalStatus('open');

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
        name: MultimediaTooltipModalRouteName,
        params: {
          presentedFrom: this.props.route.key,
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

export default React.memo<BaseProps>(
  function ConnectedMultimediaMessageMultimedia(props: BaseProps) {
    const colors = useColors();
    const keyboardState = React.useContext(KeyboardContext);
    const overlayContext = React.useContext(OverlayContext);
    return (
      <MultimediaMessageMultimedia
        {...props}
        colors={colors}
        keyboardState={keyboardState}
        overlayContext={overlayContext}
      />
    );
  },
);
