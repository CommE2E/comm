// @flow

import type { AppState } from '../redux/redux-setup';
import type { ViewStyle } from '../types/styles';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, ViewPropTypes, TouchableOpacity, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { connect } from 'lib/utils/redux-utils';

import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';

type Props = {|
  ...$Shape<React.ElementProps<typeof TextInput>>,
  searchText: string,
  onChangeText: (searchText: string) => void,
  containerStyle?: ViewStyle,
  textInputRef?: React.Ref<typeof TextInput>,
  // Redux state
  colors: Colors,
  styles: typeof styles,
|};
class Search extends React.PureComponent<Props> {
  static propTypes = {
    searchText: PropTypes.string.isRequired,
    onChangeText: PropTypes.func.isRequired,
    containerStyle: ViewPropTypes.style,
    textInputRef: PropTypes.func,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    const {
      searchText,
      onChangeText,
      containerStyle,
      textInputRef,
      colors,
      styles,
      ...rest
    } = this.props;
    const { listSearchIcon: iconColor } = colors;

    let clearSearchInputIcon = null;
    if (searchText) {
      clearSearchInputIcon = (
        <TouchableOpacity onPress={this.clearSearch} activeOpacity={0.5}>
          <Icon name="times-circle" size={18} color={iconColor} />
        </TouchableOpacity>
      );
    }

    const textInputProps: React.ElementProps<typeof TextInput> = {
      style: styles.searchInput,
      underlineColorAndroid: 'transparent',
      value: searchText,
      onChangeText: onChangeText,
      placeholderTextColor: iconColor,
      returnKeyType: 'go',
    };

    return (
      <View style={[this.props.styles.search, containerStyle]}>
        <Icon name="search" size={18} color={iconColor} />
        <TextInput {...textInputProps} {...rest} ref={textInputRef} />
        {clearSearchInputIcon}
      </View>
    );
  }

  clearSearch = () => {
    this.props.onChangeText('');
  };
}

const styles = {
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
  },
};
const stylesSelector = styleSelector(styles);

const ConnectedSearch = connect((state: AppState) => ({
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(Search);

type ConnectedProps = $Diff<Props, {| colors: Colors, styles: typeof styles |}>;
export default React.forwardRef<ConnectedProps, TextInput>(
  function ForwardedConnectedSearch(
    props: ConnectedProps,
    ref: React.Ref<typeof TextInput>,
  ) {
    return <ConnectedSearch {...props} textInputRef={ref} />;
  },
);
