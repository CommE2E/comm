// @flow

import * as React from 'react';
import { ScrollView } from 'react-native';

import { type ThreadInfo } from 'lib/types/thread-types.js';

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
        <Message
          item={props.item}
          focused={false}
          navigation={props.navigation}
          route={props.route}
          toggleFocus={onToggleFocus}
          verticalBounds={null}
        />
      </MessageListContextProvider>
    </ScrollView>
  );
}

const unboundStyles = {
  container: {
    height: '50%',
    marginTop: 20,
    marginBottom: 20,
  },
};

export default MessageResult;
