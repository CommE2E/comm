// @flow

import * as React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { type ThreadInfo } from 'lib/types/thread-types.js';
import { longAbsoluteDate } from 'lib/utils/date-utils.js';

import { MessageListContextProvider } from './message-list-types.js';
import { Message } from './message.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useStyles } from '../themes/colors.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';

type MessageResultProps = {
  +item: ChatMessageInfoItemWithHeight,
  +threadInfo: ThreadInfo,
  +navigation: AppNavigationProp<'TogglePinModal'>,
  +route: NavigationRoute<'TogglePinModal'>,
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
            verticalBounds={null}
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
