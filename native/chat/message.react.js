// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import {
  LayoutAnimation,
  TouchableWithoutFeedback,
  PixelRatio,
} from 'react-native';
import shallowequal from 'shallowequal';

import { messageKey } from 'lib/shared/message-utils.js';

import type { ChatNavigationProp } from './chat.react.js';
import MultimediaMessage from './multimedia-message.react.js';
import { RobotextMessage } from './robotext-message.react.js';
import { TextMessage } from './text-message.react.js';
import { messageItemHeight } from './utils.js';
import {
  type KeyboardState,
  KeyboardContext,
} from '../keyboard/keyboard-state.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { NavigationRoute } from '../navigation/route-names.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';
import { type VerticalBounds } from '../types/layout-types.js';
import type { LayoutEvent } from '../types/react-native.js';

type BaseProps = {
  +item: ChatMessageInfoItemWithHeight,
  +focused: boolean,
  +navigation:
    | ChatNavigationProp<'MessageList'>
    | AppNavigationProp<'TogglePinModal'>,
  +route: NavigationRoute<'MessageList'> | NavigationRoute<'TogglePinModal'>,
  +toggleFocus: (messageKey: string) => void,
  +verticalBounds: ?VerticalBounds,
};
type Props = {
  ...BaseProps,
  +keyboardState: ?KeyboardState,
};
class Message extends React.Component<Props> {
  shouldComponentUpdate(nextProps: Props): boolean {
    const { item, ...props } = this.props;
    const { item: nextItem, ...newProps } = nextProps;
    return !_isEqual(item, nextItem) || !shallowequal(props, newProps);
  }

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
          route={this.props.route}
          focused={this.props.focused}
          toggleFocus={this.props.toggleFocus}
          verticalBounds={this.props.verticalBounds}
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
    if (this.props.focused) {
      return;
    }

    const measuredHeight = event.nativeEvent.layout.height;
    const expectedHeight = messageItemHeight(this.props.item);

    const pixelRatio = 1 / PixelRatio.get();
    const distance = Math.abs(measuredHeight - expectedHeight);
    if (distance < pixelRatio) {
      return;
    }

    const approxMeasuredHeight = Math.round(measuredHeight * 100) / 100;
    const approxExpectedHeight = Math.round(expectedHeight * 100) / 100;
    console.log(
      `Message height for ${this.props.item.messageShapeType} ` +
        `${messageKey(this.props.item.messageInfo)} was expected to be ` +
        `${approxExpectedHeight} but is actually ${approxMeasuredHeight}. ` +
        "This means MessageList's FlatList isn't getting the right item " +
        'height for some of its nodes, which is guaranteed to cause glitchy ' +
        'behavior. Please investigate!!',
    );
  };

  dismissKeyboard = () => {
    const { keyboardState } = this.props;
    keyboardState && keyboardState.dismissKeyboard();
  };
}

const ConnectedMessage: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedMessage(props: BaseProps) {
    const keyboardState = React.useContext(KeyboardContext);
    return <Message {...props} keyboardState={keyboardState} />;
  },
);

export { ConnectedMessage as Message };
