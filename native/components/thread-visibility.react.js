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

type Props = {|
  threadType: ThreadType,
  color: string,
  includeLabel: boolean,
|};
class ThreadVisibility extends React.PureComponent<Props> {
  static propTypes = {
    threadType: threadTypePropType.isRequired,
    color: PropTypes.string.isRequired,
    includeLabel: PropTypes.bool,
  };
  static defaultProps = {
    includeLabel: true,
  };

  render() {
    const { threadType, color, includeLabel } = this.props;
    const visLabelStyle = [styles.visibilityLabel, { color }];
    if (threadType === threadTypes.CHAT_SECRET) {
      const label = includeLabel ? (
        <Text style={visLabelStyle}>Secret</Text>
      ) : null;
      return (
        <View style={styles.container}>
          <Icon name="lock-outline" size={18} color={color} />
          {label}
        </View>
      );
    } else {
      const label = includeLabel ? (
        <Text style={visLabelStyle}>Open</Text>
      ) : null;
      return (
        <View style={styles.container}>
          <Icon name="public" size={18} color={color} />
          {label}
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  visibilityLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingLeft: 4,
  },
});

export default ThreadVisibility;
