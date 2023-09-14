// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';

import type { SearchStatus } from './chat-thread-list.react.js';
import Button from '../components/button.react.js';
import Search from '../components/search.react.js';
import { useStyles } from '../themes/colors.js';
import { AnimatedView, type AnimatedStyleObj } from '../types/styles.js';
import { animateTowards } from '../utils/animation-utils.js';

/* eslint-disable import/no-named-as-default-member */
const { Node, Value, interpolateNode, useValue } = Animated;
/* eslint-enable import/no-named-as-default-member */

type Props = {
  +searchText: string,
  +onChangeText: (updatedSearchText: string) => mixed,
  +onBlur: () => mixed,
  +additionalProps?: $Shape<React.ElementConfig<typeof Search>>,
  +onSearchCancel: () => void,
  +searchStatus: SearchStatus,
};
function ChatThreadListSearch(props: Props): React.Node {
  const {
    searchText,
    onChangeText,
    onBlur,
    additionalProps,
    onSearchCancel,
    searchStatus,
  } = props;
  const styles = useStyles(unboundStyles);

  const searchCancelButtonOpen: Value = useValue(0);
  const searchCancelButtonProgress: Node = React.useMemo(
    () => animateTowards(searchCancelButtonOpen, 100),
    [searchCancelButtonOpen],
  );
  const searchCancelButtonOffset: Node = React.useMemo(
    () =>
      interpolateNode(searchCancelButtonProgress, {
        inputRange: [0, 1],
        outputRange: [0, 56],
      }),
    [searchCancelButtonProgress],
  );

  const isActiveOrActivating =
    searchStatus === 'active' || searchStatus === 'activating';
  React.useEffect(() => {
    if (isActiveOrActivating) {
      searchCancelButtonOpen.setValue(1);
    } else {
      searchCancelButtonOpen.setValue(0);
    }
  }, [isActiveOrActivating, searchCancelButtonOpen]);

  const animatedSearchBoxStyle: AnimatedStyleObj = React.useMemo(
    () => ({
      marginRight: searchCancelButtonOffset,
    }),
    [searchCancelButtonOffset],
  );

  const searchBoxStyle = React.useMemo(
    () => [styles.searchBox, animatedSearchBoxStyle],
    [animatedSearchBoxStyle, styles.searchBox],
  );

  const buttonStyle = React.useMemo(
    () => [
      styles.cancelSearchButtonText,
      { opacity: searchCancelButtonProgress },
    ],
    [searchCancelButtonProgress, styles.cancelSearchButtonText],
  );
  const searchInputRef = React.useRef();
  return (
    <>
      <Button
        onPress={onSearchCancel}
        disabled={searchStatus !== 'active'}
        style={styles.cancelSearchButton}
      >
        {/* eslint-disable react-native/no-raw-text */}
        <Animated.Text style={buttonStyle}>Cancel</Animated.Text>
        {/* eslint-enable react-native/no-raw-text */}
      </Button>
      <AnimatedView style={searchBoxStyle}>
        <Search
          searchText={searchText}
          onChangeText={onChangeText}
          containerStyle={styles.search}
          onBlur={onBlur}
          placeholder="Search chats"
          ref={searchInputRef}
          {...additionalProps}
        />
      </AnimatedView>
    </>
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
