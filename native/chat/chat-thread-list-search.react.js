// @flow

import * as React from 'react';
import { TextInput as BaseTextInput } from 'react-native';
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
  +onChangeText: (updatedSearchText: string) => Promise<void>,
  +onBlur: () => void,
  +onSearchCancel: () => void,
  +searchStatus: SearchStatus,
  +innerSearchAutoFocus?: boolean,
  +innerSearchActive?: boolean,
};
function ForwardedChatThreadListSearch(props: Props, ref): React.Node {
  const {
    searchText,
    onChangeText,
    onBlur,
    onSearchCancel,
    searchStatus,
    innerSearchActive,
    innerSearchAutoFocus,
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

  const innerSearchNode = React.useMemo(
    () => (
      <Search
        searchText={searchText}
        onChangeText={onChangeText}
        containerStyle={styles.search}
        onBlur={onBlur}
        placeholder="Search chats"
        ref={ref}
        autoFocus={innerSearchAutoFocus}
        active={innerSearchActive}
      />
    ),
    [
      innerSearchActive,
      innerSearchAutoFocus,
      onBlur,
      onChangeText,
      ref,
      searchText,
      styles.search,
    ],
  );

  const searchContainer = React.useMemo(
    () => <AnimatedView style={searchBoxStyle}>{innerSearchNode}</AnimatedView>,
    [innerSearchNode, searchBoxStyle],
  );

  const cancelButton = React.useMemo(
    () => (
      <Button
        onPress={onSearchCancel}
        disabled={searchStatus !== 'active'}
        style={styles.cancelSearchButton}
      >
        {/* eslint-disable react-native/no-raw-text */}
        <Animated.Text style={buttonStyle}>Cancel</Animated.Text>
        {/* eslint-enable react-native/no-raw-text */}
      </Button>
    ),
    [buttonStyle, onSearchCancel, searchStatus, styles.cancelSearchButton],
  );

  const chatThreadListSearch = React.useMemo(
    () => (
      <>
        {cancelButton}
        {searchContainer}
      </>
    ),
    [cancelButton, searchContainer],
  );

  return chatThreadListSearch;
}

const unboundStyles = {
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
};

const ChatThreadListSearch: React.AbstractComponent<
  Props,
  React.ElementRef<typeof BaseTextInput>,
> = React.forwardRef<Props, React.ElementRef<typeof BaseTextInput>>(
  ForwardedChatThreadListSearch,
);
ChatThreadListSearch.displayName = 'ChatThreadListSearch';

export default ChatThreadListSearch;
