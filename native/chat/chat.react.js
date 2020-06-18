// @flow

import * as React from 'react';
import {
  createNavigatorFactory,
  useNavigationBuilder,
  type StackNavigationState,
  type StackOptions,
  type StackNavigationEventMap,
  type StackNavigatorProps,
  type ExtraStackNavigatorProps,
} from '@react-navigation/native';
import { StackView } from '@react-navigation/stack';
import { Platform, StyleSheet } from 'react-native';
import invariant from 'invariant';

import HomeChatThreadList from './chat-thread-home.react';
import BackgroundChatThreadList from './chat-thread-background.react';
import MessageListContainer from './message-list-container.react';
import ComposeThread from './compose-thread.react';
import ThreadSettings from './settings/thread-settings.react';
import DeleteThread from './settings/delete-thread.react';
import {
  ComposeThreadRouteName,
  DeleteThreadRouteName,
  ThreadSettingsRouteName,
  MessageListRouteName,
  ChatThreadListRouteName,
  HomeChatThreadListRouteName,
  BackgroundChatThreadListRouteName,
  type ScreenParamList,
  type ChatParamList,
  type ChatTopTabsParamList,
} from '../navigation/route-names';
import HeaderBackButton from '../navigation/header-back-button.react';
import ChatHeader from './chat-header.react';
import ChatRouter, { type ChatRouterNavigationProp } from './chat-router';
import KeyboardAvoidingView from '../keyboard/keyboard-avoiding-view.react';
import MessageStorePruner from './message-store-pruner.react';
import ThreadScreenPruner from './thread-screen-pruner.react';
import ComposeThreadButton from './compose-thread-button.react';
import MessageListHeaderTitle from './message-list-header-title.react';
import ThreadSettingsButton from './thread-settings-button.react';
import { InputStateContext } from '../input/input-state';
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationProp,
} from '@react-navigation/material-top-tabs';

export type ChatTopTabsNavigationProp<
  RouteName: $Keys<ChatTopTabsParamList> = $Keys<ChatTopTabsParamList>,
> = MaterialTopTabNavigationProp<ScreenParamList, RouteName>;

const ChatThreadsTopTab = createMaterialTopTabNavigator();
const ChatThreadsComponent = () => {
  return (
    <ChatThreadsTopTab.Navigator>
      <ChatThreadsTopTab.Screen
        name={HomeChatThreadListRouteName}
        component={HomeChatThreadList}
      />
      <ChatThreadsTopTab.Screen
        name={BackgroundChatThreadListRouteName}
        component={BackgroundChatThreadList}
      />
    </ChatThreadsTopTab.Navigator>
  );
};

type ChatNavigatorProps = StackNavigatorProps<ChatRouterNavigationProp<>>;
function ChatNavigator({
  initialRouteName,
  children,
  screenOptions,
  ...rest
}: ChatNavigatorProps) {
  const { state, descriptors, navigation } = useNavigationBuilder(ChatRouter, {
    initialRouteName,
    children,
    screenOptions,
  });

  // Clear ComposeThread screens after each message is sent. If a user goes to
  // ComposeThread to create a new thread, but finds an existing one and uses it
  // instead, we can assume the intent behind opening ComposeThread is resolved
  const inputState = React.useContext(InputStateContext);
  invariant(inputState, 'InputState should be set in ChatNavigator');
  const clearComposeScreensAfterMessageSend = React.useCallback(() => {
    navigation.clearScreens([ComposeThreadRouteName]);
  }, [navigation]);
  React.useEffect(() => {
    inputState.registerSendCallback(clearComposeScreensAfterMessageSend);
    return () => {
      inputState.unregisterSendCallback(clearComposeScreensAfterMessageSend);
    };
  }, [inputState, clearComposeScreensAfterMessageSend]);

  return (
    <StackView
      {...rest}
      state={state}
      descriptors={descriptors}
      navigation={navigation}
    />
  );
}
const createChatNavigator = createNavigatorFactory<
  StackNavigationState,
  StackOptions,
  StackNavigationEventMap,
  ChatRouterNavigationProp<>,
  ExtraStackNavigatorProps,
>(ChatNavigator);

const header = props => <ChatHeader {...props} />;
const headerBackButton = props => <HeaderBackButton {...props} />;
const screenOptions = {
  header,
  headerLeft: headerBackButton,
};

const chatThreadListOptions = ({ navigation }) => ({
  headerTitle: 'Threads',
  headerRight:
    Platform.OS === 'ios'
      ? () => <ComposeThreadButton navigate={navigation.navigate} />
      : undefined,
  headerBackTitle: 'Back',
});
const messageListOptions = ({ navigation, route }) => ({
  // This is a render prop, not a component
  // eslint-disable-next-line react/display-name
  headerTitle: () => (
    <MessageListHeaderTitle
      threadInfo={route.params.threadInfo}
      navigate={navigation.navigate}
    />
  ),
  headerTitleContainerStyle: {
    marginHorizontal: Platform.select({ ios: 80, default: 0 }),
    flex: 1,
  },
  headerRight:
    Platform.OS === 'android'
      ? // This is a render prop, not a component
        // eslint-disable-next-line react/display-name
        () => (
          <ThreadSettingsButton
            threadInfo={route.params.threadInfo}
            navigate={navigation.navigate}
          />
        )
      : undefined,
  headerBackTitle: 'Back',
});
const composeThreadOptions = {
  headerTitle: 'Compose thread',
  headerBackTitle: 'Back',
};
const threadSettingsOptions = ({ route }) => ({
  headerTitle: route.params.threadInfo.uiName,
  headerBackTitle: 'Back',
});
const deleteThreadOptions = {
  headerTitle: 'Delete thread',
  headerBackTitle: 'Back',
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
});

export type ChatNavigationProp<
  RouteName: $Keys<ChatParamList> = $Keys<ChatParamList>,
> = ChatRouterNavigationProp<ScreenParamList, RouteName>;

const Chat = createChatNavigator<
  ScreenParamList,
  ChatParamList,
  ChatNavigationProp<>,
>();

const ChatComponent = () => (
  <KeyboardAvoidingView style={styles.keyboardAvoidingView}>
    <Chat.Navigator screenOptions={screenOptions}>
      <Chat.Screen
        name={ChatThreadListRouteName}
        component={ChatThreadsComponent}
        options={chatThreadListOptions}
      />
      <Chat.Screen
        name={MessageListRouteName}
        component={MessageListContainer}
        options={messageListOptions}
      />
      <Chat.Screen
        name={ComposeThreadRouteName}
        component={ComposeThread}
        options={composeThreadOptions}
      />
      <Chat.Screen
        name={ThreadSettingsRouteName}
        component={ThreadSettings}
        options={threadSettingsOptions}
      />
      <Chat.Screen
        name={DeleteThreadRouteName}
        component={DeleteThread}
        options={deleteThreadOptions}
      />
    </Chat.Navigator>
    <MessageStorePruner />
    <ThreadScreenPruner />
  </KeyboardAvoidingView>
);
export default ChatComponent;
