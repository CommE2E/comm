// @flow

import {
  visibilityRules,
  type VisibilityRules,
  visibilityRulesPropType,
} from 'lib/types/thread-types';

import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';

type Props = {|
  visibilityRules: VisibilityRules,
  color?: string,
  includeLabel: bool,
|};
class ThreadVisibility extends React.PureComponent<Props> {

  static propTypes = {
    visibilityRules: visibilityRulesPropType.isRequired,
    color: PropTypes.string,
    includeLabel: PropTypes.bool,
  };
  static defaultProps = {
    includeLabel: true,
  };

  render() {
    const visRules = this.props.visibilityRules;
    const color = this.props.color ? this.props.color : "black";
    const visLabelStyle = [styles.visibilityLabel, { color }];
    if (
      visRules === visibilityRules.CHAT_NESTED_OPEN ||
      visRules === visibilityRules.OPEN
    ) {
      const label = this.props.includeLabel
        ? <Text style={visLabelStyle}>Open</Text>
        : null;
      return (
        <View style={styles.container}>
          <Icon name="public" size={18} color={color} />
          {label}
        </View>
      );
    } else {
      const label = this.props.includeLabel
        ? <Text style={visLabelStyle}>Secret</Text>
        : null;
      return (
        <View style={styles.container}>
          <Icon name="lock-outline" size={18} color={color} />
          {label}
        </View>
      );
    }
  }

}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visibilityLabel: {
    fontSize: 16,
    fontWeight: "bold",
    paddingLeft: 4,
  },
});

export default ThreadVisibility;
