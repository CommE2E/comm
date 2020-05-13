// @flow

import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type {
  TextMessageInfo,
  LocalMessageInfo,
} from 'lib/types/message-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import {
  type VerticalBounds,
  verticalBoundsPropType,
} from '../types/layout-types';
import {
  type MessageListRoute,
  type MessageListNavProp,
  messageListRoutePropType,
  messageListNavPropType,
} from './message-list-types';

import * as React from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { messageKey } from 'lib/shared/message-utils';

import InnerTextMessage from './inner-text-message.react';
import { textMessageTooltipHeight } from './text-message-tooltip-modal.react';
import { TextMessageTooltipModalRouteName } from '../navigation/route-names';
import { ComposedMessage, clusterEndHeight } from './composed-message.react';
import { authorNameHeight } from './message-header.react';
import { failedSendHeight } from './failed-send.react';
import textMessageSendFailed from './text-message-send-failed';
import {
  type KeyboardState,
  keyboardStatePropType,
  withKeyboardState,
} from '../keyboard/keyboard-state';
import {
  withOverlayContext,
  type OverlayContextType,
  overlayContextPropType,
} from '../navigation/overlay-context';

export type ChatTextMessageInfoItemWithHeight = {|
  itemType: 'message',
  messageShapeType: 'text',
  messageInfo: TextMessageInfo,
  localMessageInfo: ?LocalMessageInfo,
  threadInfo: ThreadInfo,
  startsConversation: boolean,
  startsCluster: boolean,
  endsCluster: boolean,
  contentHeight: number,
|};

function textMessageItemHeight(item: ChatTextMessageInfoItemWithHeight) {
  const { messageInfo, contentHeight, startsCluster, endsCluster } = item;
  const { isViewer } = messageInfo.creator;
  let height = 17 + contentHeight; // for padding, margin, and text
  if (!isViewer && startsCluster) {
    height += authorNameHeight;
  }
  if (endsCluster) {
    height += clusterEndHeight;
  }
  if (textMessageSendFailed(item)) {
    height += failedSendHeight;
  }
  return height;
}

type Props = {|
  item: ChatTextMessageInfoItemWithHeight,
  navigation: MessageListNavProp,
  route: MessageListRoute,
  focused: boolean,
  toggleFocus: (messageKey: string) => void,
  verticalBounds: ?VerticalBounds,
  // withKeyboardState
  keyboardState: ?KeyboardState,
  // withOverlayContext
  overlayContext: ?OverlayContextType,
  ...React.ElementProps<typeof View>,
|};
class TextMessage extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    navigation: messageListNavPropType.isRequired,
    route: messageListRoutePropType.isRequired,
    focused: PropTypes.bool.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    verticalBounds: verticalBoundsPropType,
    keyboardState: keyboardStatePropType,
    overlayContext: overlayContextPropType,
  };
  message: ?View;

  render() {
    const {
      item,
      navigation,
      route,
      focused,
      toggleFocus,
      verticalBounds,
      keyboardState,
      overlayContext,
      ...viewProps
    } = this.props;
    return (
      <ComposedMessage
        item={item}
        sendFailed={textMessageSendFailed(item)}
        focused={focused}
        {...viewProps}
      >
        <InnerTextMessage
          item={item}
          onPress={this.onPress}
          messageRef={this.messageRef}
        />
      </ComposedMessage>
    );
  }

  messageRef = (message: ?View) => {
    this.message = message;
  };

  onPress = () => {
    if (this.dismissKeyboardIfShowing()) {
      return;
    }

    const {
      message,
      props: { verticalBounds },
    } = this;
    if (!message || !verticalBounds) {
      return;
    }

    const { focused, toggleFocus, item } = this.props;
    if (!focused) {
      toggleFocus(messageKey(item.messageInfo));
    }

    const { overlayContext } = this.props;
    invariant(overlayContext, 'TextMessage should have OverlayContext');
    overlayContext.setScrollBlockingModalStatus('open');

    message.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };

      const messageTop = pageY;
      const messageBottom = pageY + height;
      const boundsTop = verticalBounds.y;
      const boundsBottom = verticalBounds.y + verticalBounds.height;

      const belowMargin = 20;
      const belowSpace = textMessageTooltipHeight + belowMargin;
      const { isViewer } = item.messageInfo.creator;
      const aboveMargin = isViewer ? 30 : 50;
      const aboveSpace = textMessageTooltipHeight + aboveMargin;

      let location = 'below',
        margin = belowMargin;
      if (
        messageBottom + belowSpace > boundsBottom &&
        messageTop - aboveSpace > boundsTop
      ) {
        location = 'above';
        margin = aboveMargin;
      }

      this.props.navigation.navigate({
        name: TextMessageTooltipModalRouteName,
        params: {
          presentedFrom: this.props.route.key,
          initialCoordinates: coordinates,
          verticalBounds,
          location,
          margin,
          item,
        },
      });
    });
  };

  dismissKeyboardIfShowing = () => {
    const { keyboardState } = this.props;
    return !!(keyboardState && keyboardState.dismissKeyboardIfShowing());
  };
}

const WrappedTextMessage = withKeyboardState(withOverlayContext(TextMessage));

export { WrappedTextMessage as TextMessage, textMessageItemHeight };
