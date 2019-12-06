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
} from '../types/lightbox-types';
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

import * as React from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';

import { messageKey } from 'lib/shared/message-utils';

import InnerTextMessage from './inner-text-message.react';
import { textMessageTooltipHeight } from './text-message-tooltip-modal.react';
import { TextMessageTooltipModalRouteName } from '../navigation/route-names';
import { ComposedMessage, clusterEndHeight } from './composed-message.react';
import { authorNameHeight } from './message-header.react';
import { failedSendHeight } from './failed-send.react';

export type ChatTextMessageInfoItemWithHeight = {|
  itemType: "message",
  messageShapeType: "text",
  messageInfo: TextMessageInfo,
  localMessageInfo: ?LocalMessageInfo,
  threadInfo: ThreadInfo,
  startsConversation: bool,
  startsCluster: bool,
  endsCluster: bool,
  contentHeight: number,
|};

function textMessageItemHeight(
  item: ChatTextMessageInfoItemWithHeight,
  viewerID: ?string,
) {
  const { messageInfo, contentHeight, startsCluster, endsCluster } = item;
  const { id, creator } = messageInfo;
  const { isViewer } = creator;
  let height = 17 + contentHeight; // for padding, margin, and text
  if (!isViewer && startsCluster) {
    height += authorNameHeight;
  }
  if (endsCluster) {
    height += clusterEndHeight;
  }
  if (
    isViewer &&
    id !== null && id !== undefined &&
    item.localMessageInfo &&
    item.localMessageInfo.sendFailed
  ) {
    height += failedSendHeight;
  }
  return height;
}

type Props = {|
  item: ChatTextMessageInfoItemWithHeight,
  navigation: MessageListNavProp,
  focused: bool,
  toggleFocus: (messageKey: string) => void,
  verticalBounds: ?VerticalBounds,
  // withOverlayableScrollViewState
  overlayableScrollViewState: ?OverlayableScrollViewState,
  // withKeyboardState
  keyboardState: ?KeyboardState,
  ...React.ElementProps<typeof View>,
|};
class TextMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    navigation: messageListNavPropType.isRequired,
    focused: PropTypes.bool.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    verticalBounds: verticalBoundsPropType,
    overlayableScrollViewState: overlayableScrollViewStatePropType,
    keyboardState: keyboardStatePropType,
  };
  message: ?View;

  render() {
    const {
      item,
      navigation,
      focused,
      toggleFocus,
      verticalBounds,
      overlayableScrollViewState,
      keyboardState,
      ...viewProps
    } = this.props;
    const { id, creator } = item.messageInfo;
    const { isViewer } = creator;
    const sendFailed =
      isViewer &&
      (id === null || id === undefined) &&
      item.localMessageInfo &&
      item.localMessageInfo.sendFailed;

    return (
      <ComposedMessage
        item={item}
        sendFailed={!!sendFailed}
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
  }

  onPress = () => {
    if (this.dismissKeyboardIfShowing()) {
      return;
    }

    const { message, props: { verticalBounds } } = this;
    if (!message || !verticalBounds) {
      return;
    }

    const { focused, toggleFocus, item } = this.props;
    if (!focused) {
      toggleFocus(messageKey(item.messageInfo));
    }

    const { overlayableScrollViewState } = this.props;
    if (overlayableScrollViewState) {
      overlayableScrollViewState.setScrollDisabled(true);
    }

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

      let location = 'below', margin = belowMargin;
      if (
        messageBottom + belowSpace > boundsBottom &&
        messageTop - aboveSpace > boundsTop
      ) {
        location = 'above';
        margin = aboveMargin;
      }

      this.props.navigation.navigate({
        routeName: TextMessageTooltipModalRouteName,
        params: {
          initialCoordinates: coordinates,
          verticalBounds,
          location,
          margin,
          item,
        },
      });
    });
  }

  dismissKeyboardIfShowing = () => {
    const { keyboardState } = this.props;
    return !!(keyboardState && keyboardState.dismissKeyboardIfShowing());
  }

}

const WrappedTextMessage = withKeyboardState(
  withOverlayableScrollViewState(TextMessage),
);

export {
  WrappedTextMessage as TextMessage,
  textMessageItemHeight,
};
