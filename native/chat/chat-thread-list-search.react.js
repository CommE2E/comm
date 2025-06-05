// @flow

import * as React from 'react';
import { TextInput as BaseTextInput } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  withTiming,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { SearchStatus } from './chat-thread-list.react.js';
import Button from '../components/button.react.js';
import Search from '../components/search.react.js';
import { useStyles } from '../themes/colors.js';
import { AnimatedView } from '../types/styles.js';

type Props = {
  +searchText: string,
  +onChangeText: (updatedSearchText: string) => mixed,
  +onBlur: () => mixed,
  +additionalProps?: Partial<React.ElementConfig<typeof Search>>,
  +onSearchCancel: () => mixed,
  +searchStatus: SearchStatus,
  +innerSearchAutoFocus?: boolean,
  +innerSearchActive?: boolean,
  +cancelButtonExpansion: SharedValue<number>,
};
function ForwardedChatThreadListSearch(
  props: Props,
  ref: React.RefSetter<React.ElementRef<typeof BaseTextInput>>,
): React.Node {
  const {
    searchText,
    onChangeText,
    onBlur,
    onSearchCancel,
    searchStatus,
    innerSearchActive,
    innerSearchAutoFocus,
    cancelButtonExpansion,
  } = props;
  const styles = useStyles(unboundStyles);

  const isActiveOrActivating =
    searchStatus === 'active' || searchStatus === 'activating';
  React.useEffect(() => {
    if (isActiveOrActivating) {
      cancelButtonExpansion.value = withTiming(1);
    } else {
      cancelButtonExpansion.value = withTiming(0);
    }
  }, [isActiveOrActivating, cancelButtonExpansion]);

  const searchCancelButtonOffset = useDerivedValue(() =>
    interpolate(cancelButtonExpansion.value, [0, 1], [0, 56]),
  );

  const animatedSearchBoxStyle = useAnimatedStyle(() => ({
    marginRight: searchCancelButtonOffset.value,
  }));

  const searchBoxStyle = React.useMemo(
    () => [styles.searchBox, animatedSearchBoxStyle],
    [animatedSearchBoxStyle, styles.searchBox],
  );

  const animatedButtonStyle = useAnimatedStyle(() => ({
    opacity: cancelButtonExpansion.value,
  }));
  const buttonStyle = React.useMemo(
    () => [styles.cancelSearchButtonText, animatedButtonStyle],
    [animatedButtonStyle, styles.cancelSearchButtonText],
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
        <Animated.Text style={buttonStyle}>Cancel</Animated.Text>
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

const ChatThreadListSearch: React.ComponentType<Props> = React.forwardRef<
  Props,
  React.ElementRef<typeof BaseTextInput>,
>(ForwardedChatThreadListSearch);
ChatThreadListSearch.displayName = 'ChatThreadListSearch';

export default ChatThreadListSearch;
