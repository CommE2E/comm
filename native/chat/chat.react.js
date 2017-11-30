// @flow

import type { NavigationStateRoute } from 'react-navigation';

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
import {
  ThreadSettings,
  ThreadSettingsRouteName,
} from './settings/thread-settings.react';
import { getChatScreen } from './chat-screen-registry';

const Chat = StackNavigator(
  {
    [ChatThreadListRouteName]: { screen: ChatThreadList },
    [MessageListRouteName]: { screen: MessageList },
    [AddThreadRouteName]: { screen: AddThread },
    [ThreadSettingsRouteName]: { screen: ThreadSettings },
  },
  {
    navigationOptions: ({ navigation }) => ({
      tabBarLabel: 'Chat',
      tabBarIcon: ({ tintColor }) => (
        <Icon
          name="comments-o"
          style={[styles.icon, { color: tintColor }]}
        />
      ),
      tabBarOnPress: (
        scene: { index: number, focused: bool, route: NavigationStateRoute },
        jumpToIndex: (index: number) => void,
      ) => {
        if (!scene.focused) {
          jumpToIndex(scene.index);
          return;
        }
        if (scene.route.index === 0) {
          return;
        }
        const currentRoute = scene.route.routes[scene.route.index];
        const chatScreen = getChatScreen(currentRoute.key);
        if (!chatScreen) {
          return;
        }
        if (chatScreen.canReset()) {
          navigation.goBack(scene.route.routes[1].key);
        }
      },
    }),
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
