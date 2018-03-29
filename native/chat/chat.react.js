// @flow

import type { NavigationStateRoute } from 'react-navigation';

import React from 'react';
import { Platform } from 'react-native';
import { StackNavigator } from 'react-navigation';

import {
  ChatThreadList,
  ChatThreadListRouteName,
} from './chat-thread-list.react';
import { MessageList, MessageListRouteName } from './message-list.react';
import { ComposeThread, ComposeThreadRouteName } from './compose-thread.react';
import {
  ThreadSettings,
  ThreadSettingsRouteName,
} from './settings/thread-settings.react';
import { getChatScreen } from './chat-screen-registry';
import {
  DeleteThread,
  DeleteThreadRouteName,
} from './settings/delete-thread.react';
import ChatIcon from './chat-icon.react';
import ChatLabel from './chat-label.react';

const Chat = StackNavigator(
  {
    [ChatThreadListRouteName]: { screen: ChatThreadList },
    [MessageListRouteName]: { screen: MessageList },
    [ComposeThreadRouteName]: { screen: ComposeThread },
    [ThreadSettingsRouteName]: { screen: ThreadSettings },
    [DeleteThreadRouteName]: { screen: DeleteThread },
  },
  {
    navigationOptions: ({ navigation }) => ({
      tabBarLabel: Platform.OS === "android"
        ? ({ tintColor }) => <ChatLabel color={tintColor} />
        : 'Chat',
      tabBarIcon: ({ tintColor }) => <ChatIcon color={tintColor} />,
      tabBarOnPress: ({ scene, jumpToIndex}: {
        scene: { index: number, focused: bool, route: NavigationStateRoute },
        jumpToIndex: (index: number) => void,
      }) => {
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

const ChatRouteName = 'Chat';
export {
  Chat,
  ChatRouteName,
};
