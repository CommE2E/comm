// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';

import type { MessageInfo } from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import { MessageSearchContext } from './search-provider.react.js';
import Statement from './statement.react.js';
import type { ChatNavigationProp } from '../chat/chat.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

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

  // eslint-disable-next-line no-unused-vars
  const [lastID, setLastID] = React.useState();

  // eslint-disable-next-line no-unused-vars
  const [searchResults, setSearchResults] = React.useState([]);

  // eslint-disable-next-line no-unused-vars
  const appendSearchResults = React.useCallback(
    (newMessages: $ReadOnlyArray<MessageInfo>) => {
      setSearchResults(oldMessages => [...oldMessages, ...newMessages]);
    },
    [],
  );

  React.useEffect(() => {
    setSearchResults([]);
    setLastID(undefined);
  }, [query]);

  const styles = useStyles(unboundStyles);

  if (query === '') {
    return (
      <View style={styles.content}>
        <Statement text="Your search results will appear here" />
      </View>
    );
  }

  return null;
}

const unboundStyles = {
  content: {
    height: '100%',
    backgroundColor: 'panelBackground',
  },
};

export default MessageSearch;
