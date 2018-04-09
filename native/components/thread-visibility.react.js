// @flow

import {
  threadTypes,
  type ThreadType,
  threadTypePropType,
} from 'lib/types/thread-types';

import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';

import { threadIsOpen } from 'lib/permissions/thread-permissions';

type Props = {|
  threadType: ThreadType,
  color?: string,
  includeLabel: bool,
|};
class ThreadVisibility extends React.PureComponent<Props> {

  static propTypes = {
    threadType: threadTypePropType.isRequired,
    color: PropTypes.string,
    includeLabel: PropTypes.bool,
  };
  static defaultProps = {
    includeLabel: true,
  };

  render() {
    const threadType = this.props.threadType;
    const color = this.props.color ? this.props.color : "black";
    const visLabelStyle = [styles.visibilityLabel, { color }];
    if (threadIsOpen(threadType)) {
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
