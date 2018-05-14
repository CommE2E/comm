// @flow

import type {
  ____ViewStyleProp_Internal as ViewStyle,
  ____TextStyleProp_Internal as TextStyle,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import * as React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  ViewPropTypes,
} from 'react-native';
import PropTypes from 'prop-types';

export type Label = string | () => React.Node;
export const labelPropType = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.func,
]);

type Props = {
  onPress: (userCallback: () => void) => void,
  onPressUserCallback: () => void,
  label: Label,
  containerStyle: ?ViewStyle,
  labelStyle: ?TextStyle,
};
class TooltipItem extends React.PureComponent<Props> {

  static propTypes = {
    onPress: PropTypes.func.isRequired,
    onPressUserCallback: PropTypes.func.isRequired,
    label: labelPropType.isRequired,
    containerStyle: ViewPropTypes.style,
    labelStyle: Text.propTypes.style,
  };
  static defaultProps = {
    labelStyle: null,
    containerStyle: null,
  };

  render() {
    const label = typeof this.props.label === 'string'
      ? <Text style={this.props.labelStyle}>{this.props.label}</Text>
      : this.props.label();
    return (
      <View style={[styles.itemContainer, this.props.containerStyle]}>
        <TouchableOpacity onPress={this.onPress}>
          {label}
        </TouchableOpacity>
      </View>
    );
  }

  onPress = () => {
    this.props.onPress(this.props.onPressUserCallback);
  }

}

const styles = StyleSheet.create({
  itemContainer: {
    padding: 10,
  },
});

export default TooltipItem;
