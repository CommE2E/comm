// @flow

import type { AppState } from '../redux/redux-setup';
import { type Colors, colorsPropType } from '../themes/colors';
import type { ViewStyle, Styles } from '../types/styles';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, ViewPropTypes, TouchableOpacity, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { connect } from 'lib/utils/redux-utils';

import { colorsSelector, styleSelector } from '../themes/colors';

type Props = {|
  searchText: string,
  onChangeText: (searchText: string) => void,
  style?: ViewStyle,
  textInputRef?: React.Ref<TextInput>,
  // Redux state
  colors: Colors,
  styles: Styles,
  ...$Shape<React.ElementProps<typeof TextInput>>,
|};
class Search extends React.PureComponent<Props> {
  static propTypes = {
    searchText: PropTypes.string.isRequired,
    onChangeText: PropTypes.func.isRequired,
    style: ViewPropTypes.style,
    textInputRef: PropTypes.func,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    const {
      searchText,
      onChangeText,
      style,
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

    return (
      <View style={[this.props.styles.search, style]}>
        <Icon name="search" size={18} color={iconColor} />
        <TextInput
          style={this.props.styles.searchInput}
          underlineColorAndroid="transparent"
          value={searchText}
          onChangeText={onChangeText}
          placeholderTextColor={iconColor}
          returnKeyType="go"
          ref={textInputRef}
          {...rest}
        />
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
    backgroundColor: 'listSearchBackground',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    padding: 0,
    marginVertical: 0,
    color: 'listForegroundLabel',
  },
};
const stylesSelector = styleSelector(styles);

const ConnectedSearch = connect((state: AppState) => ({
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(Search);

type ConnectedProps = $Diff<Props, {| colors: Colors, styles: Styles |}>;
export default React.forwardRef<Props, TextInput>(
  (props: ConnectedProps, ref: ?TextInput) => (
    <ConnectedSearch {...props} textInputRef={ref} />
  ),
);
