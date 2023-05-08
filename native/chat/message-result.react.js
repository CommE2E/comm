// @flow

import * as React from 'react';
import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { type ThreadInfo } from 'lib/types/thread-types.js';
import { longAbsoluteDate } from 'lib/utils/date-utils.js';

import type { ChatNavigationProp } from './chat.react';
import { MessageListContextProvider } from './message-list-types.js';
import { Message } from './message.react.js';
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
    | ChatNavigationProp<'MessageResultsScreen'>,
  +route:
    | NavigationRoute<'TogglePinModal'>
    | NavigationRoute<'MessageResultsScreen'>,
  +messageVerticalBounds: ?VerticalBounds,
};

function MessageResult(props: MessageResultProps): React.Node {
  const styles = useStyles(unboundStyles);

  const onToggleFocus = React.useCallback(() => {}, []);

  return (
    <ScrollView style={styles.container}>
      <MessageListContextProvider threadInfo={props.threadInfo}>
        <View style={styles.viewContainer}>
          <Message
            item={props.item}
            focused={false}
            navigation={props.navigation}
            route={props.route}
            toggleFocus={onToggleFocus}
            verticalBounds={props.messageVerticalBounds}
            shouldDisplayPinIndicator={false}
          />
          <Text style={styles.messageDate}>
            {longAbsoluteDate(props.item.messageInfo.time)}
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
