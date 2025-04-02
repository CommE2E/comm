// @flow

import * as React from 'react';
import {
  LayoutAnimation,
  TouchableWithoutFeedback,
  PixelRatio,
} from 'react-native';

import { chatMessageItemKey } from 'lib/shared/chat-message-item-utils.js';
import { useCanToggleMessagePin } from 'lib/utils/message-pinning-utils.js';

import type { ChatNavigationProp } from './chat.react.js';
import { DeletedMessage } from './deleted-message.react.js';
import MultimediaMessage from './multimedia-message.react.js';
import { RobotextMessage } from './robotext-message.react.js';
import { TextMessage } from './text-message.react.js';
import { messageItemHeight } from './utils.js';
import { KeyboardContext } from '../keyboard/keyboard-state.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { NavigationRoute } from '../navigation/route-names.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';
import { type VerticalBounds } from '../types/layout-types.js';
import type { LayoutEvent } from '../types/react-native.js';

type Props = {
  +item: ChatMessageInfoItemWithHeight,
  +focused: boolean,
  +navigation:
    | ChatNavigationProp<'MessageList'>
    | AppNavigationProp<'TogglePinModal'>
    | ChatNavigationProp<'PinnedMessagesScreen'>
    | ChatNavigationProp<'MessageSearch'>,
  +route:
    | NavigationRoute<'MessageList'>
    | NavigationRoute<'TogglePinModal'>
    | NavigationRoute<'PinnedMessagesScreen'>
    | NavigationRoute<'MessageSearch'>,
  +toggleFocus: (messageKey: string) => void,
  +verticalBounds: ?VerticalBounds,
  shouldDisplayPinIndicator: boolean,
};
function Message(props: Props): React.Node {
  const {
    focused,
    item,
    navigation,
    route,
    toggleFocus,
    verticalBounds,
    shouldDisplayPinIndicator,
  } = props;

  const focusedOrStartsConversation = focused || item.startsConversation;
  React.useEffect(() => {
    LayoutAnimation.easeInEaseOut();
  }, [focusedOrStartsConversation]);

  const keyboardState = React.useContext(KeyboardContext);
  const dismissKeyboard = keyboardState?.dismissKeyboard;
  const onMessagePress = React.useCallback(
    () => dismissKeyboard?.(),
    [dismissKeyboard],
  );

  const onLayout = React.useCallback(
    (event: LayoutEvent) => {
      if (focused) {
        return;
      }

      const measuredHeight = event.nativeEvent.layout.height;
      const expectedHeight = messageItemHeight(item);

      const pixelRatio = 1 / PixelRatio.get();
      const distance = Math.abs(measuredHeight - expectedHeight);
      if (distance < pixelRatio) {
        return;
      }

      const approxMeasuredHeight = Math.round(measuredHeight * 100) / 100;
      const approxExpectedHeight = Math.round(expectedHeight * 100) / 100;

      console.log(
        `Message height for ${item.messageShapeType} ` +
          `${chatMessageItemKey(item)} was expected to be ` +
          `${approxExpectedHeight} but is actually ${approxMeasuredHeight}. ` +
          "This means MessageList's FlatList isn't getting the right item " +
          'height for some of its nodes, which is guaranteed to cause glitchy ' +
          'behavior. Please investigate!!',
      );
    },
    [focused, item],
  );

  const canTogglePins = useCanToggleMessagePin(
    props.item.messageInfo,
    props.item.threadInfo,
  );

  const innerMessageNode = React.useMemo(() => {
    if (item.deleted) {
      return <DeletedMessage item={item} />;
    } else if (item.messageShapeType === 'text') {
      return (
        <TextMessage
          item={item}
          navigation={navigation}
          route={route}
          focused={focused}
          toggleFocus={toggleFocus}
          verticalBounds={verticalBounds}
          canTogglePins={canTogglePins}
          shouldDisplayPinIndicator={shouldDisplayPinIndicator}
        />
      );
    } else if (item.messageShapeType === 'multimedia') {
      return (
        <MultimediaMessage
          item={item}
          focused={focused}
          toggleFocus={toggleFocus}
          verticalBounds={verticalBounds}
          canTogglePins={canTogglePins}
          shouldDisplayPinIndicator={shouldDisplayPinIndicator}
        />
      );
    } else {
      return (
        <RobotextMessage
          item={item}
          navigation={navigation}
          route={route}
          focused={focused}
          toggleFocus={toggleFocus}
          verticalBounds={verticalBounds}
        />
      );
    }
  }, [
    focused,
    item,
    navigation,
    route,
    shouldDisplayPinIndicator,
    toggleFocus,
    verticalBounds,
    canTogglePins,
  ]);

  const message = React.useMemo(
    () => (
      <TouchableWithoutFeedback
        onPress={onMessagePress}
        onLayout={__DEV__ ? onLayout : undefined}
      >
        {innerMessageNode}
      </TouchableWithoutFeedback>
    ),
    [innerMessageNode, onLayout, onMessagePress],
  );
  return message;
}

export default Message;
