// @flow

import type {
  NavigationScreenProp,
  NavigationStateRoute,
} from 'react-navigation';

import * as React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from 'react-navigation-stack';

import ChatThreadList from './chat-thread-list.react';
import MessageListContainer from './message-list-container.react';
import ComposeThread from './compose-thread.react';
import ThreadSettings from './settings/thread-settings.react';
import { getChatScreen } from './chat-screen-registry';
import DeleteThread from './settings/delete-thread.react';
import ChatIcon from './chat-icon.react';
import {
  ComposeThreadRouteName,
  DeleteThreadRouteName,
  ThreadSettingsRouteName,
  MessageListRouteName,
  ChatThreadListRouteName,
} from '../navigation/route-names';
import Header from '../navigation/header.react';
import HeaderBackButton from '../navigation/header-back-button.react';

const ChatNavigator = createStackNavigator(
  {
    [ChatThreadListRouteName]: ChatThreadList,
    [MessageListRouteName]: MessageListContainer,
    [ComposeThreadRouteName]: ComposeThread,
    [ThreadSettingsRouteName]: ThreadSettings,
    [DeleteThreadRouteName]: DeleteThread,
  },
  {
    defaultNavigationOptions: ({ navigation }) => ({
      header: Header,
      headerLeft: navigation.isFirstRouteInParent()
        ? undefined
        : HeaderBackButton,
    }),
  },
);
ChatNavigator.navigationOptions = ({ navigation }) => ({
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
    const currentRoute = state.routes[state.index];
    const chatScreen = getChatScreen(currentRoute.key);
    if (!chatScreen) {
      return;
    }
    if (chatScreen.canReset) {
      navigation.goBack(state.routes[1].key);
    }
  },
});

export default ChatNavigator;
