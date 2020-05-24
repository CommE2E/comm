// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import type { LeafRoute } from '@react-navigation/native';
import type { MessageListParams } from './message-list-types';

import * as React from 'react';
import {
  createNavigatorFactory,
  useNavigationBuilder,
} from '@react-navigation/native';
import { StackView } from '@react-navigation/stack';
import { Platform, StyleSheet } from 'react-native';
import invariant from 'invariant';

import ChatThreadList from './chat-thread-list.react';
import MessageListContainer from './message-list-container.react';
import ComposeThread, {
  type ComposeThreadParams,
} from './compose-thread.react';
import ThreadSettings, {
  type ThreadSettingsParams,
} from './settings/thread-settings.react';
import DeleteThread, {
  type DeleteThreadParams,
} from './settings/delete-thread.react';
import {
  ComposeThreadRouteName,
  DeleteThreadRouteName,
  ThreadSettingsRouteName,
  MessageListRouteName,
  ChatThreadListRouteName,
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

function ChatNavigator({
  initialRouteName,
  children,
  screenOptions,
  ...rest
}) {
  const { state, descriptors, navigation } = useNavigationBuilder(
    ChatRouter,
    {
      initialRouteName,
      children,
      screenOptions,
    },
  );

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
const createChatNavigator = createNavigatorFactory(ChatNavigator);

const header = props => <ChatHeader {...props} />;
const headerBackButton = props => <HeaderBackButton {...props} />;
const screenOptions = {
  header,
  headerLeft: headerBackButton,
};

const chatThreadListOptions = ({ navigation }) => ({
  headerTitle: 'Threads',
  headerRight:
    Platform.OS === 'ios' ? (
      () => <ComposeThreadButton navigate={navigation.navigate} />
    ) : null,
  headerBackTitle: 'Back',
});
const messageListOptions = ({ navigation, route }) => ({
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
    Platform.OS === 'android' ? (
      () => (
        <ThreadSettingsButton
          threadInfo={route.params.threadInfo}
          navigate={navigation.navigate}
        />
      )
    ) : null,
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

type ChatParamList = {
  ChatThreadList: void,
  MessageList: MessageListParams,
  ComposeThread: ComposeThreadParams,
  ThreadSettings: ThreadSettingsParams,
  DeleteThread: DeleteThreadParams,
};
export type ChatNavigationRoute<RouteName: string> = {|
  ...LeafRoute<RouteName>,
  +params: $ElementType<ChatParamList, RouteName>,
|};
export type ChatNavigationProp<RouteName: string> = ChatRouterNavigationProp<
  ChatParamList,
  RouteName,
>;

const Chat = createChatNavigator();
export default () => (
  <KeyboardAvoidingView style={styles.keyboardAvoidingView}>
    <Chat.Navigator screenOptions={screenOptions}>
      <Chat.Screen
        name={ChatThreadListRouteName}
        component={ChatThreadList}
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
