// @flow

import * as React from 'react';
import {
  type NavigationRouteConfigMap,
  type NavigationState,
  createKeyboardAwareNavigator,
  createNavigator,
} from 'react-navigation';
import {
  StackView,
  type StackNavigatorConfig,
  type NavigationStackScreenOptions,
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
import {
  type ChatInputState,
  chatInputStatePropType,
  withChatInputState,
} from './chat-input-state';
import KeyboardAvoidingView from '../keyboard/keyboard-avoiding-view.react';
import MessageStorePruner from './message-store-pruner.react';
import ThreadScreenPruner from './thread-screen-pruner.react';

type NavigationProp = NavigationStackProp<NavigationState> & {
  clearScreens: (routeNames: $ReadOnlyArray<string>) => void,
};
type Props = {| navigation: NavigationProp |};
type StackViewProps = React.ElementConfig<typeof StackView> & {
  +navigation: NavigationProp,
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
      NavigationProp,
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
    navigation: NavigationProp,
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

type WrappedProps = {
  ...Props,
  // withChatInputState
  chatInputState: ?ChatInputState,
};
class WrappedChatNavigator extends React.PureComponent<WrappedProps> {
  static propTypes = {
    chatInputState: chatInputStatePropType,
  };

  componentDidUpdate(prevProps: WrappedProps) {
    const { navigation, chatInputState } = this.props;
    if (chatInputState && prevProps.navigation !== navigation) {
      chatInputState.registerSendCallback(() =>
        navigation.clearScreens([ComposeThreadRouteName]),
      );
    }
  }

  render() {
    const { chatInputState, ...props } = this.props;
    return (
      <KeyboardAvoidingView style={styles.keyboardAvoidingView}>
        <ChatNavigator {...props} />
        <MessageStorePruner />
        <ThreadScreenPruner />
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
});

const ConnectedWrappedChatNavigator = withChatInputState(WrappedChatNavigator);

function FinalChatNavigator(props: Props) {
  return <ConnectedWrappedChatNavigator {...props} />;
}
hoistNonReactStatics(FinalChatNavigator, ChatNavigator);

export default FinalChatNavigator;
