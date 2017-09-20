// @flow

import React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { StackNavigator } from 'react-navigation';

import {
  ChatThreadList,
  ChatThreadListRouteName,
} from './chat-thread-list.react';
import { MessageList, MessageListRouteName } from './message-list.react';
import { AddThread, AddThreadRouteName } from './add-thread.react';

const Chat = StackNavigator(
  {
    [ChatThreadListRouteName]: { screen: ChatThreadList },
    [MessageListRouteName]: { screen: MessageList },
    [AddThreadRouteName]: { screen: AddThread },
  },
  {
    navigationOptions: {
      tabBarLabel: 'Chat',
      tabBarIcon: ({ tintColor }) => (
        <Icon
          name="comments-o"
          style={[styles.icon, { color: tintColor }]}
        />
      ),
    },
  },
);

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
