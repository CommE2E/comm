// @flow

import type { AppState } from '../redux/redux-setup';

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { unreadCount } from 'lib/selectors/thread-selectors';

type Props = {
  color: string,
  // Redux state
  unreadCount: number,
};
class ChatLabel extends React.PureComponent<Props> {

  static propTypes = {
    color: PropTypes.string.isRequired,
    unreadCount: PropTypes.number.isRequired,
  };

  render() {
    const text = (
      <Text
        style={[styles.text, { color: this.props.color }]}
        allowFontScaling={true}
      >
        CHAT
      </Text>
    );
    if (!this.props.unreadCount) {
      return text;
    }
    return (
      <View>
        {text}
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
  text: {
    textAlign: 'center',
    fontSize: 13,
    margin: 8,
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    right: -13,
    top: 8,
    backgroundColor: 'red',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    paddingBottom: 1,
  },
});

export default connect((state: AppState) => ({
  unreadCount: unreadCount(state),
}))(ChatLabel);
