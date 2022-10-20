// @flow

import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationProp,
} from '@react-navigation/material-top-tabs';
import {
  createNavigatorFactory,
  useNavigationBuilder,
  type StackNavigationState,
  type StackOptions,
  type StackNavigationEventMap,
  type StackNavigatorProps,
  type ExtraStackNavigatorProps,
  type StackHeaderProps as CoreStackHeaderProps,
  type StackNavigationProp,
  type StackNavigationHelpers,
  type ParamListBase,
} from '@react-navigation/native';
import { StackView, type StackHeaderProps } from '@react-navigation/stack';
import invariant from 'invariant';
import * as React from 'react';
import { Platform, View } from 'react-native';
import { useSelector } from 'react-redux';

import { isLoggedIn } from 'lib/selectors/user-selectors';
import {
  threadIsPending,
  threadMembersWithoutAddedAshoat,
} from 'lib/shared/thread-utils';
import { firstLine } from 'lib/utils/string-utils';

import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react';
import SWMansionIcon from '../components/swmansion-icon.react';
import { InputStateContext } from '../input/input-state';
import HeaderBackButton from '../navigation/header-back-button.react';
import { defaultStackScreenOptions } from '../navigation/options';
import {
  ComposeSubchannelRouteName,
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
import { useColors, useStyles } from '../themes/colors';
import BackgroundChatThreadList from './background-chat-thread-list.react';
import ChatHeader from './chat-header.react';
import ChatRouter, { type ChatRouterNavigationHelpers } from './chat-router';
import ComposeSubchannel from './compose-subchannel.react';
import ComposeThreadButton from './compose-thread-button.react';
import HomeChatThreadList from './home-chat-thread-list.react';
import MessageListContainer from './message-list-container.react';
import MessageListHeaderTitle from './message-list-header-title.react';
import MessageStorePruner from './message-store-pruner.react';
import DeleteThread from './settings/delete-thread.react';
import ThreadSettings from './settings/thread-settings.react';
import ThreadDraftUpdater from './thread-draft-updater.react';
import ThreadScreenPruner from './thread-screen-pruner.react';
import ThreadSettingsButton from './thread-settings-button.react';

const unboundStyles = {
  keyboardAvoidingView: {
    flex: 1,
  },
  view: {
    flex: 1,
    backgroundColor: 'listBackground',
  },
  threadListHeaderStyle: {
    elevation: 0,
    shadowOffset: { width: 0, height: 0 },
    borderBottomWidth: 0,
    backgroundColor: '#0A0A0A',
  },
};

export type ChatTopTabsNavigationProp<
  RouteName: $Keys<ChatTopTabsParamList> = $Keys<ChatTopTabsParamList>,
> = MaterialTopTabNavigationProp<ScreenParamList, RouteName>;

const homeChatThreadListOptions = {
  title: 'Focused',
  // eslint-disable-next-line react/display-name
  tabBarIcon: ({ color }) => (
    <SWMansionIcon name="home-1" size={22} style={{ color }} />
  ),
};
const backgroundChatThreadListOptions = {
  title: 'Background',
  // eslint-disable-next-line react/display-name
  tabBarIcon: ({ color }) => (
    <SWMansionIcon name="bell-disabled" size={22} style={{ color }} />
  ),
};

const ChatThreadsTopTab = createMaterialTopTabNavigator();
function ChatThreadsComponent(): React.Node {
  const colors = useColors();
  const { tabBarBackground, tabBarAccent } = colors;
  const screenOptions = React.useMemo(
    () => ({
      tabBarShowIcon: true,
      tabBarStyle: {
        backgroundColor: tabBarBackground,
      },
      tabBarItemStyle: {
        flexDirection: 'row',
      },
      tabBarIndicatorStyle: {
        borderColor: tabBarAccent,
        borderBottomWidth: 2,
      },
    }),
    [tabBarAccent, tabBarBackground],
  );
  return (
    <ChatThreadsTopTab.Navigator screenOptions={screenOptions}>
      <ChatThreadsTopTab.Screen
        name={HomeChatThreadListRouteName}
        component={HomeChatThreadList}
        options={homeChatThreadListOptions}
      />
      <ChatThreadsTopTab.Screen
        name={BackgroundChatThreadListRouteName}
        component={BackgroundChatThreadList}
        options={backgroundChatThreadListOptions}
      />
    </ChatThreadsTopTab.Navigator>
  );
}

export type ChatNavigationHelpers<ParamList: ParamListBase = ParamListBase> = {
  ...$Exact<StackNavigationHelpers<ParamList>>,
  ...ChatRouterNavigationHelpers,
};

type ChatNavigatorProps = StackNavigatorProps<ChatNavigationHelpers<>>;
function ChatNavigator({
  initialRouteName,
  children,
  screenOptions,
  defaultScreenOptions,
  screenListeners,
  id,
  ...rest
}: ChatNavigatorProps) {
  const { state, descriptors, navigation } = useNavigationBuilder(ChatRouter, {
    id,
    initialRouteName,
    children,
    screenOptions,
    defaultScreenOptions,
    screenListeners,
  });

  // Clear ComposeSubchannel screens after each message is sent. If a user goes
  // to ComposeSubchannel to create a new thread, but finds an existing one and
  // uses it instead, we can assume the intent behind opening ComposeSubchannel
  // is resolved
  const inputState = React.useContext(InputStateContext);
  invariant(inputState, 'InputState should be set in ChatNavigator');
  const clearComposeScreensAfterMessageSend = React.useCallback(() => {
    navigation.clearScreens([ComposeSubchannelRouteName]);
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
      detachInactiveScreens={Platform.OS !== 'ios'}
    />
  );
}
const createChatNavigator = createNavigatorFactory<
  StackNavigationState,
  StackOptions,
  StackNavigationEventMap,
  ChatNavigationHelpers<>,
  ExtraStackNavigatorProps,
>(ChatNavigator);

const header = (props: CoreStackHeaderProps) => {
  // Flow has trouble reconciling identical types between different libdefs,
  // and flow-typed has no way for one libdef to depend on another
  const castProps: StackHeaderProps = (props: any);
  return <ChatHeader {...castProps} />;
};
const headerBackButton = props => <HeaderBackButton {...props} />;

const chatThreadListOptions = ({ navigation }) => ({
  headerTitle: 'Inbox',
  headerRight:
    Platform.OS === 'ios'
      ? () => <ComposeThreadButton navigate={navigation.navigate} />
      : undefined,
  headerBackTitleVisible: false,
  headerStyle: unboundStyles.threadListHeaderStyle,
});

const messageListOptions = ({ navigation, route }) => {
  const isSearchEmpty =
    !!route.params.searching &&
    threadMembersWithoutAddedAshoat(route.params.threadInfo).length === 1;

  const areSettingsEnabled =
    !threadIsPending(route.params.threadInfo.id) && !isSearchEmpty;

  return {
    // This is a render prop, not a component
    // eslint-disable-next-line react/display-name
    headerTitle: props => (
      <MessageListHeaderTitle
        threadInfo={route.params.threadInfo}
        navigate={navigation.navigate}
        areSettingsEnabled={areSettingsEnabled}
        isSearchEmpty={isSearchEmpty}
        {...props}
      />
    ),
    headerRight:
      Platform.OS === 'android' && areSettingsEnabled
        ? // This is a render prop, not a component
          // eslint-disable-next-line react/display-name
          () => (
            <ThreadSettingsButton
              threadInfo={route.params.threadInfo}
              navigate={navigation.navigate}
            />
          )
        : undefined,
    headerBackTitleVisible: false,
  };
};
const composeThreadOptions = {
  headerTitle: 'Compose chat',
  headerBackTitleVisible: false,
};
const threadSettingsOptions = ({ route }) => ({
  headerTitle: firstLine(route.params.threadInfo.uiName),
  headerBackTitleVisible: false,
});
const deleteThreadOptions = {
  headerTitle: 'Delete chat',
  headerBackTitleVisible: false,
};

export type ChatNavigationProp<
  RouteName: $Keys<ChatParamList> = $Keys<ChatParamList>,
> = {
  ...StackNavigationProp<ScreenParamList, RouteName>,
  ...ChatRouterNavigationHelpers,
};

const Chat = createChatNavigator<
  ScreenParamList,
  ChatParamList,
  ChatNavigationHelpers<ScreenParamList>,
>();
// eslint-disable-next-line no-unused-vars
export default function ChatComponent(props: { ... }): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const loggedIn = useSelector(isLoggedIn);
  let draftUpdater = null;
  if (loggedIn) {
    draftUpdater = <ThreadDraftUpdater />;
  }

  const screenOptions = React.useMemo(
    () => ({
      ...defaultStackScreenOptions,
      header,
      headerLeft: headerBackButton,
      headerStyle: {
        backgroundColor: colors.tabBarBackground,
        borderBottomWidth: 1,
      },
    }),
    [colors.tabBarBackground],
  );

  return (
    <View style={styles.view}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoidingView}
      >
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
            name={ComposeSubchannelRouteName}
            component={ComposeSubchannel}
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
        {draftUpdater}
      </KeyboardAvoidingView>
    </View>
  );
}
