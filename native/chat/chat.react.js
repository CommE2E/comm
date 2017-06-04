// @flow

import React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { ChatThreadList } from './chat-thread-list.react';

type Props = {
};
type State = {
};
class Chat extends React.PureComponent {

  props: Props;
  state: State;
  static propTypes = {
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

  render() {
    return <ChatThreadList />;
  }

}

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
});

const ChatRouteName = 'Chat';

export {
  Chat,
  ChatRouteName,
};
