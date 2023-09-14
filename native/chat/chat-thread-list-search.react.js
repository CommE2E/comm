// @flow

import * as React from 'react';

import Search from '../components/search.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +searchText: string,
  +onChangeText: (updatedSearchText: string) => Promise<void>,
  +onBlur: () => void,
  +additionalProps?: $Shape<React.ElementConfig<typeof Search>>,
};
function ChatThreadListSearch(props: Props): React.Node {
  const { searchText, onChangeText, onBlur, additionalProps } = props;
  const styles = useStyles(unboundStyles);

  const searchInputRef = React.useRef();
  return (
    <Search
      searchText={searchText}
      onChangeText={onChangeText}
      containerStyle={styles.search}
      onBlur={onBlur}
      placeholder="Search chats"
      ref={searchInputRef}
      {...additionalProps}
    />
  );
}

const unboundStyles = {
  icon: {
    fontSize: 28,
  },
  container: {
    flex: 1,
  },
  searchContainer: {
    backgroundColor: 'listBackground',
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  searchBox: {
    flex: 1,
  },
  search: {
    marginBottom: 8,
    marginHorizontal: 18,
    marginTop: 16,
  },
  cancelSearchButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
  },
  cancelSearchButtonText: {
    color: 'link',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  flatList: {
    flex: 1,
    backgroundColor: 'listBackground',
  },
};
export default ChatThreadListSearch;
