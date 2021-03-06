// @flow

import * as React from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { isLoggedIn } from 'lib/selectors/user-selectors';

import { useSelector } from '../redux/redux-utils';
import { useStyles, useColors } from '../themes/colors';
import type { ViewStyle } from '../types/styles';

type Props = {|
  ...React.ElementConfig<typeof TextInput>,
  +searchText: string,
  +onChangeText: (searchText: string) => mixed,
  +containerStyle?: ViewStyle,
|};
const Search = React.forwardRef<Props, typeof TextInput>(
  function ForwardedSearch(props: Props, ref: React.Ref<typeof TextInput>) {
    const { onChangeText, searchText, containerStyle, ...rest } = props;

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
        <TouchableOpacity onPress={clearSearch} activeOpacity={0.5}>
          <Icon name="times-circle" size={18} color={iconColor} />
        </TouchableOpacity>
      );
    }

    const textInputProps: React.ElementProps<typeof TextInput> = {
      style: styles.searchInput,
      value: searchText,
      onChangeText: onChangeText,
      placeholderTextColor: iconColor,
      returnKeyType: 'go',
    };

    return (
      <View style={[styles.search, containerStyle]}>
        <Icon name="search" size={18} color={iconColor} />
        <TextInput {...textInputProps} {...rest} ref={ref} />
        {clearSearchInputIcon}
      </View>
    );
  },
);

const unboundStyles = {
  search: {
    alignItems: 'center',
    backgroundColor: 'listSearchBackground',
    borderRadius: 6,
    flexDirection: 'row',
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 6,
  },
  searchInput: {
    color: 'listForegroundLabel',
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    marginVertical: 0,
    padding: 0,
    borderBottomColor: 'transparent',
  },
};

export default React.memo<Props>(Search);
