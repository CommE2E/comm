// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  LayoutAnimation,
  TouchableWithoutFeedback,
  PixelRatio,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { messageKey } from 'lib/shared/message-utils';

import {
  type KeyboardState,
  KeyboardContext,
} from '../keyboard/keyboard-state';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context';
import type { NavigationRoute } from '../navigation/route-names';
import {
  MultimediaMessageTooltipModalRouteName,
  RobotextMessageTooltipModalRouteName,
  TextMessageTooltipModalRouteName,
} from '../navigation/route-names';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types';
import { type VerticalBounds } from '../types/layout-types';
import type { LayoutEvent } from '../types/react-native';
import { AnimatedView } from '../types/styles';
import type { ChatNavigationProp } from './chat.react';
import MultimediaMessage from './multimedia-message.react';
import { RobotextMessage } from './robotext-message.react';
import { TextMessage } from './text-message.react';
import { getMessageTooltipKey, messageItemHeight } from './utils';

/* eslint-disable import/no-named-as-default-member */
const { Node, sub, interpolateNode, Extrapolate } = Animated;
/* eslint-enable import/no-named-as-default-member */

type BaseProps = {
  +item: ChatMessageInfoItemWithHeight,
  +focused: boolean,
  +navigation: ChatNavigationProp<'MessageList'>,
  +route: NavigationRoute<'MessageList'>,
  +toggleFocus: (messageKey: string) => void,
  +verticalBounds: ?VerticalBounds,
};
type Props = {
  ...BaseProps,
  +keyboardState: ?KeyboardState,
  +overlayContext: OverlayContextType,
};
type State = {
  +opacity: number | Node,
};
class Message extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      opacity: this.getOpacity(),
    };
  }

  static getModalOverlayPosition(props: Props) {
    const {
      overlayContext: { visibleOverlays },
      item,
    } = props;
    for (const overlay of visibleOverlays) {
      if (
        (overlay.routeName === MultimediaMessageTooltipModalRouteName ||
          overlay.routeName === TextMessageTooltipModalRouteName ||
          overlay.routeName === RobotextMessageTooltipModalRouteName) &&
        overlay.routeKey === getMessageTooltipKey(item)
      ) {
        return overlay.position;
      }
    }
    return undefined;
  }

  getOpacity() {
    const overlayPosition = Message.getModalOverlayPosition(this.props);
    if (!overlayPosition) {
      return 1;
    }
    return sub(
      1,
      interpolateNode(overlayPosition, {
        inputRange: [0.1, 0.11],
        outputRange: [0, 1],
        extrapolate: Extrapolate.CLAMP,
      }),
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (
      (prevProps.focused || prevProps.item.startsConversation) !==
      (this.props.focused || this.props.item.startsConversation)
    ) {
      LayoutAnimation.easeInEaseOut();
    }

    const overlayPosition = Message.getModalOverlayPosition(this.props);
    const prevOverlayPosition = Message.getModalOverlayPosition(prevProps);
    if (overlayPosition !== prevOverlayPosition) {
      this.setState({ opacity: this.getOpacity() });
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
    const messageStyle = {
      opacity: this.state.opacity,
    };
    return (
      <TouchableWithoutFeedback
        onPress={this.dismissKeyboard}
        onLayout={onLayout}
      >
        <AnimatedView style={messageStyle}>{message}</AnimatedView>
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
    const overlayContext = React.useContext(OverlayContext);
    invariant(overlayContext, 'should be set');
    return (
      <Message
        {...props}
        keyboardState={keyboardState}
        overlayContext={overlayContext}
      />
    );
  },
);

export { ConnectedMessage as Message };
