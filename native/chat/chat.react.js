// @flow

import type {
  NavigationScreenProp,
  NavigationStateRoute,
} from 'react-navigation';

import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from 'react-navigation';

import ChatThreadList from './chat-thread-list.react';
import MessageList from './message-list.react';
import ComposeThread from './compose-thread.react';
import ThreadSettings from './settings/thread-settings.react';
import { getChatScreen } from './chat-screen-registry';
import DeleteThread from './settings/delete-thread.react';
import ChatIcon from './chat-icon.react';
import ChatLabel from './chat-label.react';
import {
  ComposeThreadRouteName,
  DeleteThreadRouteName,
  ThreadSettingsRouteName,
  MessageListRouteName,
  ChatThreadListRouteName,
} from '../navigation/route-names';

const Chat = createStackNavigator({
  [ChatThreadListRouteName]: { screen: ChatThreadList },
  [MessageListRouteName]: { screen: MessageList },
  [ComposeThreadRouteName]: { screen: ComposeThread },
  [ThreadSettingsRouteName]: { screen: ThreadSettings },
  [DeleteThreadRouteName]: { screen: DeleteThread },
});
Chat.navigationOptions = ({ navigation }) => ({
  tabBarLabel: Platform.OS === "android"
    ? ({ tintColor }) => <ChatLabel color={tintColor} />
    : "Chat",
  tabBarIcon: ({ tintColor }) => <ChatIcon color={tintColor} />,
  tabBarOnPress: ({ navigation, defaultHandler }: {
    navigation: NavigationScreenProp<NavigationStateRoute>,
    defaultHandler: () => void,
  }) => {
    if (!navigation.isFocused()) {
      defaultHandler();
      return;
    }
    const state = navigation.state;
    if (state.index === 0) {
      return;
    }
    const currentRoute = state.routes[state.index];
    const chatScreen = getChatScreen(currentRoute.key);
    if (!chatScreen) {
      return;
    }
    if (chatScreen.canReset()) {
      navigation.goBack(state.routes[1].key);
    }
  },
});

export default Chat;
