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
  messageListRoutePropType,
  messageListNavPropType,
} from './message-list-types';
import {
  type KeyboardState,
  keyboardStatePropType,
  withKeyboardState,
} from '../keyboard/keyboard-state';
import type { ChatNavigationProp } from './chat.react';
import type { NavigationRoute } from '../navigation/route-names';
import type { LayoutEvent } from '../types/react-native';

import * as React from 'react';
import { LayoutAnimation, TouchableWithoutFeedback } from 'react-native';
import PropTypes from 'prop-types';

import { messageKey } from 'lib/shared/message-utils';

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
  navigation: ChatNavigationProp<'MessageList'>,
  route: NavigationRoute<'MessageList'>,
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

    const onLayout = __DEV__ ? this.onLayout : undefined;
    return (
      <TouchableWithoutFeedback
        onPress={this.dismissKeyboard}
        onLayout={onLayout}
      >
        {message}
      </TouchableWithoutFeedback>
    );
  }

  onLayout = (event: LayoutEvent) => {
    const expectedHeight = messageItemHeight(this.props.item);

    const approxMeasuredHeight =
      Math.round(event.nativeEvent.layout.height * 1000) / 1000;
    const approxExpectedHeight = Math.round(expectedHeight * 1000) / 1000;
    if (approxMeasuredHeight !== approxExpectedHeight) {
      console.log(
        `Message height for ${this.props.item.messageShapeType} ` +
          `${messageKey(this.props.item.messageInfo)} was expected to be ` +
          `${approxExpectedHeight} but is actually ${approxMeasuredHeight}. ` +
          "This means MessageList's FlatList isn't getting the right item " +
          'height for some of its nodes, which is guaranteed to cause ' +
          'glitchy behavior. Please investigate!!',
      );
    }
  };

  dismissKeyboard = () => {
    const { keyboardState } = this.props;
    keyboardState && keyboardState.dismissKeyboard();
  };
}

const WrappedMessage = withKeyboardState(Message);

export { WrappedMessage as Message, messageItemHeight };
