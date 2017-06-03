// @flow

import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { ChatThreadItem } from '../selectors/chat-selectors';
import { chatThreadItemPropType } from '../selectors/chat-selectors';

import React from 'react';
import { View, StyleSheet, Text, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { chatListData } from '../selectors/chat-selectors';

type Props = {
  // Redux state
  chatListData: $ReadOnlyArray<ChatThreadItem>,
};
type State = {
};
class InnerChat extends React.PureComponent {

  props: Props;
  state: State;
  static propTypes = {
    chatListData: PropTypes.arrayOf(chatThreadItemPropType).isRequired,
  };
  static navigationOptions = {
    tabBarLabel: 'Chat',
    tabBarIcon: ({ tintColor }) => (
      <Icon
        name="comments-o"
        style={[styles.icon, { color: tintColor }]}
      />
    ),
  };
  flatList: ?FlatList<ChatThreadItem> = null;

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.instructions}>
          Stay down
        </Text>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

const ChatRouteName = 'Chat';
const Chat = connect((state: AppState) => ({
  chatListData: chatListData(state),
}))(InnerChat);

export {
  Chat,
  ChatRouteName,
};
