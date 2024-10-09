// @flow

import * as React from 'react';
import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { chatMessageInfoItemTimestamp } from 'lib/shared/chat-message-item-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import { type ChatNavigationProp } from './chat.react.js';
import { MessageListContextProvider } from './message-list-types.js';
import Message from './message.react.js';
import { modifyItemForResultScreen } from './utils.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useStyles } from '../themes/colors.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';
import type { VerticalBounds } from '../types/layout-types.js';

type MessageResultProps = {
  +item: ChatMessageInfoItemWithHeight,
  +threadInfo: ThreadInfo,
  +navigation:
    | AppNavigationProp<'TogglePinModal'>
    | ChatNavigationProp<'PinnedMessagesScreen'>
    | ChatNavigationProp<'MessageSearch'>,
  +route:
    | NavigationRoute<'TogglePinModal'>
    | NavigationRoute<'PinnedMessagesScreen'>
    | NavigationRoute<'MessageSearch'>,
  +messageVerticalBounds: ?VerticalBounds,
  +scrollable: boolean,
};

function MessageResult(props: MessageResultProps): React.Node {
  const styles = useStyles(unboundStyles);

  const onToggleFocus = React.useCallback(() => {}, []);

  const item = React.useMemo(
    () => modifyItemForResultScreen(props.item),
    [props.item],
  );

  const containerStyle = React.useMemo(
    () =>
      props.scrollable
        ? [styles.container, styles.containerOverflow]
        : styles.container,
    [props.scrollable, styles.container, styles.containerOverflow],
  );

  return (
    <ScrollView style={containerStyle}>
      <MessageListContextProvider threadInfo={props.threadInfo}>
        <View style={styles.viewContainer}>
          <Message
            item={item}
            focused={false}
            navigation={props.navigation}
            route={props.route}
            toggleFocus={onToggleFocus}
            verticalBounds={props.messageVerticalBounds}
            shouldDisplayPinIndicator={false}
          />
          <Text style={styles.messageDate}>
            {chatMessageInfoItemTimestamp(props.item)}
          </Text>
        </View>
      </MessageListContextProvider>
    </ScrollView>
  );
}

const unboundStyles = {
  container: {
    marginTop: 5,
    backgroundColor: 'panelForeground',
  },
  containerOverflow: {
    overflow: 'scroll',
    maxHeight: 400,
  },
  viewContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  messageDate: {
    color: 'messageLabel',
    fontSize: 12,
    marginLeft: 55,
  },
};

export default MessageResult;
