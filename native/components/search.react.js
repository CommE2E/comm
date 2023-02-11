// @flow

import * as React from 'react';
import {
  View,
  TouchableOpacity,
  TextInput as BaseTextInput,
  Text,
  Platform,
} from 'react-native';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';

import SWMansionIcon from './swmansion-icon.react.js';
import TextInput from './text-input.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles, useColors } from '../themes/colors.js';
import type { ViewStyle } from '../types/styles.js';

type Props = {
  ...React.ElementConfig<typeof BaseTextInput>,
  +searchText: string,
  +onChangeText: (searchText: string) => mixed,
  +containerStyle?: ViewStyle,
  +active?: boolean,
};

function ForwardedSearch(props: Props, ref) {
  const { onChangeText, searchText, containerStyle, active, ...rest } = props;

  const clearSearch = React.useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  const loggedIn = useSelector(isLoggedIn);
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const prevLoggedInRef = React.useRef();
  React.useEffect(() => {
    const prevLoggedIn = prevLoggedInRef.current;
    prevLoggedInRef.current = loggedIn;
    if (!loggedIn && prevLoggedIn) {
      clearSearch();
    }
  }, [loggedIn, clearSearch]);

  const { listSearchIcon: iconColor } = colors;

  let clearSearchInputIcon = null;
  if (searchText) {
    clearSearchInputIcon = (
      <TouchableOpacity
        onPress={clearSearch}
        activeOpacity={0.5}
        style={styles.clearSearchButton}
      >
        <SWMansionIcon name="cross-circle" size={20} color={iconColor} />
      </TouchableOpacity>
    );
  }

  const inactive = active === false;
  const usingPlaceholder = !searchText && rest.placeholder;
  const inactiveTextStyle = React.useMemo(
    () =>
      inactive && usingPlaceholder
        ? [styles.searchText, styles.inactiveSearchText, { color: iconColor }]
        : [styles.searchText, styles.inactiveSearchText],
    [
      inactive,
      usingPlaceholder,
      styles.searchText,
      styles.inactiveSearchText,
      iconColor,
    ],
  );

  let textNode;
  if (!inactive) {
    const textInputProps: React.ElementProps<typeof BaseTextInput> = {
      style: styles.searchText,
      value: searchText,
      onChangeText: onChangeText,
      placeholderTextColor: iconColor,
      returnKeyType: 'go',
    };
    textNode = <TextInput {...textInputProps} {...rest} ref={ref} />;
  } else {
    const text = usingPlaceholder ? rest.placeholder : searchText;
    textNode = <Text style={inactiveTextStyle}>{text}</Text>;
  }

  return (
    <View style={[styles.search, containerStyle]}>
      <SWMansionIcon name="search" size={22} color={iconColor} />
      {textNode}
      {clearSearchInputIcon}
    </View>
  );
}

const Search: React.AbstractComponent<
  Props,
  React.ElementRef<typeof BaseTextInput>,
> = React.forwardRef<Props, React.ElementRef<typeof BaseTextInput>>(
  ForwardedSearch,
);
Search.displayName = 'Search';

const unboundStyles = {
  search: {
    alignItems: 'center',
    backgroundColor: 'listSearchBackground',
    borderRadius: 8,
    flexDirection: 'row',
    paddingLeft: 14,
    paddingRight: 7,
  },
  inactiveSearchText: {
    transform: Platform.select({
      ios: [{ translateY: 1 / 3 }],
      default: undefined,
    }),
  },
  searchText: {
    color: 'listForegroundLabel',
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    marginVertical: 6,
    padding: 0,
    borderBottomColor: 'transparent',
  },
  clearSearchButton: {
    paddingVertical: 5,
    paddingLeft: 5,
  },
};

const MemoizedSearch: typeof Search = React.memo<
  Props,
  React.ElementRef<typeof BaseTextInput>,
>(Search);

export default MemoizedSearch;
