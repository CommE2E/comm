// @flow

import type { ChatRobotextMessageInfoItemWithHeight } from './robotext-message.react';
import type { ChatTextMessageInfoItemWithHeight } from './text-message.react';
import type { ChatMultimediaMessageInfoItem } from './multimedia-message.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
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
import {
  type KeyboardState,
  keyboardStatePropType,
  withKeyboardState,
} from '../keyboard/keyboard-state';

import * as React from 'react';
import { LayoutAnimation, TouchableWithoutFeedback } from 'react-native';
import PropTypes from 'prop-types';

import { TextMessage, textMessageItemHeight } from './text-message.react';
import {
  RobotextMessage,
  robotextMessageItemHeight,
} from './robotext-message.react';
import {
  MultimediaMessage,
  multimediaMessageItemHeight,
} from './multimedia-message.react';
import { timestampHeight } from './timestamp.react';

export type ChatMessageInfoItemWithHeight =
  | ChatRobotextMessageInfoItemWithHeight
  | ChatTextMessageInfoItemWithHeight
  | ChatMultimediaMessageInfoItem;

function messageItemHeight(item: ChatMessageInfoItemWithHeight) {
  let height = 0;
  if (item.messageShapeType === 'text') {
    height += textMessageItemHeight(item);
  } else if (item.messageShapeType === 'multimedia') {
    height += multimediaMessageItemHeight(item);
  } else {
    height += robotextMessageItemHeight(item);
  }
  if (item.startsConversation) {
    height += timestampHeight;
  }
  return height;
}

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  focused: boolean,
  navigation: MessageListNavProp,
  route: MessageListRoute,
  toggleFocus: (messageKey: string) => void,
  verticalBounds: ?VerticalBounds,
  // withKeyboardState
  keyboardState: ?KeyboardState,
|};
class Message extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    focused: PropTypes.bool.isRequired,
    navigation: messageListNavPropType.isRequired,
    route: messageListRoutePropType.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    verticalBounds: verticalBoundsPropType,
    keyboardState: keyboardStatePropType,
  };

  componentDidUpdate(prevProps: Props) {
    if (
      (prevProps.focused || prevProps.item.startsConversation) !==
      (this.props.focused || this.props.item.startsConversation)
    ) {
      LayoutAnimation.easeInEaseOut();
    }
  }

  render() {
    let message;
    if (this.props.item.messageShapeType === 'text') {
      message = (
        <TextMessage
          item={this.props.item}
          navigation={this.props.navigation}
          route={this.props.route}
          focused={this.props.focused}
          toggleFocus={this.props.toggleFocus}
          verticalBounds={this.props.verticalBounds}
        />
      );
    } else if (this.props.item.messageShapeType === 'multimedia') {
      message = (
        <MultimediaMessage
          item={this.props.item}
          navigation={this.props.navigation}
          route={this.props.route}
          focused={this.props.focused}
          toggleFocus={this.props.toggleFocus}
          verticalBounds={this.props.verticalBounds}
        />
      );
    } else {
      message = (
        <RobotextMessage
          item={this.props.item}
          navigation={this.props.navigation}
          focused={this.props.focused}
          toggleFocus={this.props.toggleFocus}
        />
      );
    }
    return (
      <TouchableWithoutFeedback onPress={this.dismissKeyboard}>
        {message}
      </TouchableWithoutFeedback>
    );
  }

  dismissKeyboard = () => {
    const { keyboardState } = this.props;
    keyboardState && keyboardState.dismissKeyboard();
  };
}

const WrappedMessage = withKeyboardState(Message);

export { WrappedMessage as Message, messageItemHeight };
