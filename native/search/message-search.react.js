/* eslint-disable no-unused-vars */
// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';

import type { ThreadInfo } from 'lib/types/thread-types.js';

import { MessageSearchContext } from './search-provider.react.js';
import Statement from './statement.react.js';
import type { ChatNavigationProp } from '../chat/chat.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import type { ChatMessageItemWithHeight } from '../types/chat-types.js';

export type MessageSearchParams = {
  +threadInfo: ThreadInfo,
};

export type MessageSearchProps = {
  +navigation: ChatNavigationProp<'MessageSearch'>,
  +route: NavigationRoute<'MessageSearch'>,
};

function MessageSearch(props: MessageSearchProps): React.Node {
  const searchContext = React.useContext(MessageSearchContext);
  invariant(searchContext, 'searchContext should be set');
  const { query, clearQuery } = searchContext;

  React.useEffect(() => {
    return props.navigation.addListener('beforeRemove', () => {
      clearQuery();
    });
  }, [props.navigation, clearQuery]);

  const [measuredMessages, setMeasuredMessages] = React.useState([]);

  const appendMeasuredMessages = React.useCallback(
    (newMessages: $ReadOnlyArray<ChatMessageItemWithHeight>) => {
      setMeasuredMessages(oldMessages => [
        ...oldMessages.filter(item => item.itemType !== 'loader'),
        ...newMessages,
      ]);
    },
    [],
  );

  const [lastID, setLastID] = React.useState(undefined);

  React.useEffect(() => {
    setMeasuredMessages([]);
    setLastID(undefined);
  }, [query]);

  const styles = useStyles(unboundStyles);

  if (query === '') {
    return (
      <View style={styles.content}>
        <Statement text="Your search results will appear here!" />
      </View>
    );
  }

  return <View></View>;
}

const unboundStyles = {
  content: {
    height: '100%',
    backgroundColor: 'panelBackground',
  },
};

export default MessageSearch;
