// @flow

import type { ThreadInfo } from 'lib/types/thread-types';

import * as React from 'react';
import {
  type NavigationRouteConfigMap,
  type NavigationState,
  createKeyboardAwareNavigator,
  createNavigator,
  type NavigationStackScreenOptions,
} from 'react-navigation';
import {
  StackView,
  type StackNavigatorConfig,
  type NavigationStackProp,
} from 'react-navigation-stack';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { StyleSheet } from 'react-native';

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
import HeaderBackButton from '../navigation/header-back-button.react';
import ChatHeader from './chat-header.react';
import ChatRouter from './chat-router';
import { InputStateContext } from '../input/input-state';
import KeyboardAvoidingView from '../keyboard/keyboard-avoiding-view.react';
import MessageStorePruner from './message-store-pruner.react';
import ThreadScreenPruner from './thread-screen-pruner.react';

export type ChatNavProp<State> = NavigationStackProp<State> & {
  clearScreens: (
    routeNames: $ReadOnlyArray<string>,
    preserveFocus: boolean,
  ) => void,
  replaceWithThread: (threadInfo: ThreadInfo) => void,
  clearThreads: (
    threadIDs: $ReadOnlyArray<string>,
    preserveFocus: boolean,
  ) => void,
  pushNewThread: (threadInfo: ThreadInfo) => void,
};
type Props = {| navigation: ChatNavProp<NavigationState> |};
type StackViewProps = React.ElementConfig<typeof StackView> & {
  +navigation: ChatNavProp<NavigationState>,
};

function createChatNavigator(
  routeConfigMap: NavigationRouteConfigMap,
  stackConfig?: StackNavigatorConfig = {},
) {
  const {
    initialRouteName,
    initialRouteParams,
    paths,
    navigationOptions,
    defaultNavigationOptions,
    initialRouteKey,
    ...navigatorConfig
  } = stackConfig;
  const routerConfig = {
    initialRouteName,
    initialRouteParams,
    paths,
    navigationOptions,
    defaultNavigationOptions,
    initialRouteKey,
  };
  return createKeyboardAwareNavigator<Props>(
    createNavigator<
      NavigationStackScreenOptions,
      NavigationState,
      StackNavigatorConfig,
      ChatNavProp<NavigationState>,
      StackViewProps,
    >(StackView, ChatRouter(routeConfigMap, routerConfig), navigatorConfig),
    navigatorConfig,
  );
}

const ChatNavigator = createChatNavigator(
  {
    [ChatThreadListRouteName]: ChatThreadList,
    [MessageListRouteName]: MessageListContainer,
    [ComposeThreadRouteName]: ComposeThread,
    [ThreadSettingsRouteName]: ThreadSettings,
    [DeleteThreadRouteName]: DeleteThread,
  },
  {
    defaultNavigationOptions: ({ navigation }) => ({
      header: ChatHeader,
      headerLeft: navigation.isFirstRouteInParent()
        ? undefined
        : HeaderBackButton,
    }),
  },
);
ChatNavigator.navigationOptions = {
  // eslint-disable-next-line react/display-name
  tabBarIcon: ({ tintColor }) => <ChatIcon color={tintColor} />,
  tabBarOnPress: ({
    navigation,
    defaultHandler,
  }: {
    navigation: ChatNavProp<NavigationState>,
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
      navigation.popToTop();
    }
  },
};

function WrappedChatNavigator(props: Props) {
  const { navigation } = props;
  const inputState = React.useContext(InputStateContext);

  const clearScreens = React.useCallback(
    () => navigation.clearScreens([ComposeThreadRouteName], true),
    [navigation],
  );

  React.useEffect(() => {
    if (!inputState) {
      return undefined;
    }
    inputState.registerSendCallback(clearScreens);
    return () => inputState.unregisterSendCallback(clearScreens);
  }, [inputState, clearScreens]);

  return (
    <KeyboardAvoidingView style={styles.keyboardAvoidingView}>
      <ChatNavigator {...props} />
      <MessageStorePruner />
      <ThreadScreenPruner />
    </KeyboardAvoidingView>
  );
}
hoistNonReactStatics(WrappedChatNavigator, ChatNavigator);

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
});

export default WrappedChatNavigator;
