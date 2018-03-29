// @flow

import type { AppState } from '../redux-setup';

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { unreadCount } from 'lib/selectors/thread-selectors';

type Props = {
  color: string,
  // Redux state
  unreadCount: number,
};
class ChatIcon extends React.PureComponent<Props> {

  static propTypes = {
    color: PropTypes.string.isRequired,
    unreadCount: PropTypes.number.isRequired,
  };

  render() {
    const icon = (
      <Icon
        name="comments-o"
        style={[styles.icon, { color: this.props.color }]}
      />
    );
    if (!this.props.unreadCount) {
      return icon;
    }
    return (
      <View>
        {icon}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {this.props.unreadCount}
          </Text>
        </View>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: 2,
    backgroundColor: 'red',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
  },
});

export default connect((state: AppState) => ({
  unreadCount: unreadCount(state),
}))(ChatIcon);
