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
import { Platform, View, useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';

import ThreadDraftUpdater from 'lib/components/thread-draft-updater.react.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  threadIsPending,
  threadMembersWithoutAddedAshoat,
} from 'lib/shared/thread-utils.js';

import BackgroundChatThreadList from './background-chat-thread-list.react.js';
import ChatHeader from './chat-header.react.js';
import ChatRouter, { type ChatRouterNavigationHelpers } from './chat-router.js';
import ComposeSubchannel from './compose-subchannel.react.js';
import ComposeThreadButton from './compose-thread-button.react.js';
import FullScreenThreadMediaGallery from './fullscreen-thread-media-gallery.react.js';
import HomeChatThreadList from './home-chat-thread-list.react.js';
import MessageListContainer from './message-list-container.react.js';
import MessageListHeaderTitle from './message-list-header-title.react.js';
import MessageStorePruner from './message-store-pruner.react.js';
import DeleteThread from './settings/delete-thread.react.js';
import ThreadSettings from './settings/thread-settings.react.js';
import ThreadScreenPruner from './thread-screen-pruner.react.js';
import ThreadSettingsButton from './thread-settings-button.react.js';
import ThreadSettingsHeaderTitle from './thread-settings-header-title.react.js';
import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { InputStateContext } from '../input/input-state.js';
import CommunityDrawerButton from '../navigation/community-drawer-button.react.js';
import type { CommunityDrawerNavigationProp } from '../navigation/community-drawer-navigator.react.js';
import HeaderBackButton from '../navigation/header-back-button.react.js';
import { defaultStackScreenOptions } from '../navigation/options.js';
import {
  ComposeSubchannelRouteName,
  DeleteThreadRouteName,
  ThreadSettingsRouteName,
  FullScreenThreadMediaGalleryRouteName,
  MessageListRouteName,
  ChatThreadListRouteName,
  HomeChatThreadListRouteName,
  BackgroundChatThreadListRouteName,
  type ScreenParamList,
  type ChatParamList,
  type ChatTopTabsParamList,
} from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';

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
    backgroundColor: 'tabBarBackground',
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
    headerRight: areSettingsEnabled
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
    headerTitleAlign: areSettingsEnabled ? 'left' : 'center',
    headerLeftContainerStyle: { width: Platform.OS === 'ios' ? 32 : 40 },
  };
};
const composeThreadOptions = {
  headerTitle: 'Compose chat',
  headerBackTitleVisible: false,
};
const threadSettingsOptions = ({ route }) => ({
  // eslint-disable-next-line react/display-name
  headerTitle: props => (
    <ThreadSettingsHeaderTitle
      threadInfo={route.params.threadInfo}
      {...props}
    />
  ),
  headerBackTitleVisible: false,
});
const fullScreenThreadMediaGalleryOptions = {
  headerTitle: 'All Media',
  headerBackTitleVisible: false,
};
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

type Props = {
  +navigation: CommunityDrawerNavigationProp<'TabNavigator'>,
  ...
};
export default function ChatComponent(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const loggedIn = useSelector(isLoggedIn);
  let draftUpdater = null;
  if (loggedIn) {
    draftUpdater = <ThreadDraftUpdater />;
  }

  const headerLeftButton = React.useCallback(
    headerProps => {
      if (headerProps.canGoBack) {
        return <HeaderBackButton {...headerProps} />;
      }
      return <CommunityDrawerButton navigation={props.navigation} />;
    },
    [props.navigation],
  );

  const { width: screenWidth } = useWindowDimensions();
  const screenOptions = React.useMemo(
    () => ({
      ...defaultStackScreenOptions,
      header,
      headerLeft: headerLeftButton,
      headerStyle: {
        backgroundColor: colors.tabBarBackground,
        borderBottomWidth: 1,
      },
      gestureEnabled: true,
      gestureResponseDistance: screenWidth,
    }),
    [colors.tabBarBackground, headerLeftButton, screenWidth],
  );

  const chatThreadListOptions = React.useCallback(
    ({ navigation }) => ({
      headerTitle: 'Inbox',
      headerRight:
        Platform.OS === 'ios'
          ? () => <ComposeThreadButton navigate={navigation.navigate} />
          : undefined,
      headerBackTitleVisible: false,
      headerStyle: styles.threadListHeaderStyle,
    }),
    [styles.threadListHeaderStyle],
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
            name={FullScreenThreadMediaGalleryRouteName}
            component={FullScreenThreadMediaGallery}
            options={fullScreenThreadMediaGalleryOptions}
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
