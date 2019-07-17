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
import type { Navigate } from '../navigation/route-names';

import * as React from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';
import { KeyboardUtils } from 'react-native-keyboard-input';

import { messageKey } from 'lib/shared/message-utils';

import InnerTextMessage from './inner-text-message.react';
import { textMessageTooltipHeight } from './text-message-tooltip-modal.react';
import { TextMessageTooltipModalRouteName } from '../navigation/route-names';
import ComposedMessage from './composed-message.react';

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
    height += 25; // for username
  }
  if (endsCluster) {
    height += 7; // extra padding at the end of a cluster
  }
  if (
    isViewer &&
    id !== null && id !== undefined &&
    item.localMessageInfo &&
    item.localMessageInfo.sendFailed
  ) {
    height += 22; // extra padding for sendFailed
  }
  return height;
}

type Props = {|
  item: ChatTextMessageInfoItemWithHeight,
  navigate: Navigate,
  focused: bool,
  toggleFocus: (messageKey: string) => void,
  setScrollDisabled: (scrollDisabled: bool) => void,
  verticalBounds: ?VerticalBounds,
  keyboardShowing: bool,
  scrollDisabled: bool,
|};
class TextMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    focused: PropTypes.bool.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    setScrollDisabled: PropTypes.func.isRequired,
    verticalBounds: verticalBoundsPropType,
    keyboardShowing: PropTypes.bool.isRequired,
    scrollDisabled: PropTypes.bool.isRequired,
  };
  message: ?View;

  componentDidUpdate(prevProps: Props) {
    if (
      !this.props.scrollDisabled &&
      prevProps.scrollDisabled &&
      this.props.focused
    ) {
      this.props.toggleFocus(messageKey(this.props.item.messageInfo));
    }
  }

  render() {
    const { item } = this.props;
    const { id, creator } = item.messageInfo;
    const { isViewer } = creator;
    const sendFailed =
      isViewer &&
      (id === null || id === undefined) &&
      item.localMessageInfo &&
      item.localMessageInfo.sendFailed;

    return (
      <ComposedMessage
        item={this.props.item}
        sendFailed={!!sendFailed}
      >
        <InnerTextMessage
          item={this.props.item}
          focused={this.props.focused}
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
    if (this.props.keyboardShowing) {
      KeyboardUtils.dismiss();
      return;
    }

    const { message, props: { verticalBounds } } = this;
    if (!message || !verticalBounds) {
      return;
    }

    const { focused, toggleFocus, item, setScrollDisabled } = this.props;
    if (!focused) {
      toggleFocus(messageKey(item.messageInfo));
    }
    setScrollDisabled(true);

    message.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };

      const messageTop = pageY;
      const messageBottom = pageY + height;
      const boundsTop = verticalBounds.y;
      const boundsBottom = verticalBounds.y + verticalBounds.height;

      const belowMargin = 20;
      const belowSpace = textMessageTooltipHeight + belowMargin;
      const aboveMargin = 30;
      const aboveSpace = textMessageTooltipHeight + aboveMargin;

      let location = 'below', margin = belowMargin;
      if (
        messageBottom + belowSpace > boundsBottom &&
        messageTop - aboveSpace > boundsTop
      ) {
        location = 'above';
        margin = aboveMargin;
      }

      this.props.navigate({
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

}

export {
  TextMessage,
  textMessageItemHeight,
};
