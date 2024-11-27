// @flow

import type {
  MaterialTopTabNavigationProp,
  StackNavigationState,
  StackOptions,
  StackNavigationEventMap,
  StackNavigatorProps,
  ExtraStackNavigatorProps,
  StackHeaderProps,
  StackNavigationProp,
  StackNavigationHelpers,
  ParamListBase,
  StackRouterOptions,
  MaterialTopTabNavigationHelpers,
  HeaderTitleInputProps,
  StackHeaderLeftButtonProps,
} from '@react-navigation/core';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import {
  createNavigatorFactory,
  useNavigationBuilder,
} from '@react-navigation/native';
import { StackView } from '@react-navigation/stack';
import invariant from 'invariant';
import * as React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import type { MeasureOnSuccessCallback } from 'react-native/Libraries/Renderer/shims/ReactNativeTypes';

import MessageStorePruner from 'lib/components/message-store-pruner.react.js';
import ThreadDraftUpdater from 'lib/components/thread-draft-updater.react.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { threadSettingsNotificationsCopy } from 'lib/shared/thread-settings-notifications-utils.js';
import { threadIsPending, threadIsSidebar } from 'lib/shared/thread-utils.js';
import type { ReactRefSetter } from 'lib/types/react-types.js';

import BackgroundChatThreadList from './background-chat-thread-list.react.js';
import ChatHeader from './chat-header.react.js';
import {
  backgroundChatThreadListOptions,
  homeChatThreadListOptions,
} from './chat-options.js';
import ChatRouter, {
  type ChatRouterNavigationHelpers,
  type ChatRouterNavigationAction,
} from './chat-router.js';
import TabBar from './chat-tab-bar.react.js';
import ComposeSubchannel from './compose-subchannel.react.js';
import ComposeThreadButton from './compose-thread-button.react.js';
import FullScreenThreadMediaGallery from './fullscreen-thread-media-gallery.react.js';
import HomeChatThreadList from './home-chat-thread-list.react.js';
import { MessageEditingContext } from './message-editing-context.react.js';
import MessageListContainer from './message-list-container.react.js';
import MessageListHeaderTitle from './message-list-header-title.react.js';
import PinnedMessagesScreen from './pinned-messages-screen.react.js';
import DeleteThread from './settings/delete-thread.react.js';
import EmojiThreadAvatarCreation from './settings/emoji-thread-avatar-creation.react.js';
import ThreadSettingsNotifications from './settings/thread-settings-notifications.react.js';
import ThreadSettings from './settings/thread-settings.react.js';
import ThreadScreenPruner from './thread-screen-pruner.react.js';
import ThreadSettingsButton from './thread-settings-button.react.js';
import ThreadSettingsHeaderTitle from './thread-settings-header-title.react.js';
import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react.js';
import { NUXHandler } from '../components/nux-handler.react.js';
import {
  nuxTip,
  NUXTipsContext,
} from '../components/nux-tips-context.react.js';
import { InputStateContext } from '../input/input-state.js';
import CommunityDrawerButton from '../navigation/community-drawer-button.react.js';
import HeaderBackButton from '../navigation/header-back-button.react.js';
import { activeThreadSelector } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import {
  defaultStackScreenOptions,
  transitionPreset,
} from '../navigation/options.js';
import {
  ComposeSubchannelRouteName,
  DeleteThreadRouteName,
  ThreadSettingsRouteName,
  EmojiThreadAvatarCreationRouteName,
  FullScreenThreadMediaGalleryRouteName,
  PinnedMessagesScreenRouteName,
  MessageListRouteName,
  ChatThreadListRouteName,
  HomeChatThreadListRouteName,
  BackgroundChatThreadListRouteName,
  ThreadSettingsNotificationsRouteName,
  type ScreenParamList,
  type ChatParamList,
  type ChatTopTabsParamList,
  MessageSearchRouteName,
  ChangeRolesScreenRouteName,
  type NavigationRoute,
} from '../navigation/route-names.js';
import type { TabNavigationProp } from '../navigation/tab-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import ChangeRolesHeaderLeftButton from '../roles/change-roles-header-left-button.react.js';
import ChangeRolesScreen from '../roles/change-roles-screen.react.js';
import MessageSearch from '../search/message-search.react.js';
import SearchHeader from '../search/search-header.react.js';
import SearchMessagesButton from '../search/search-messages-button.react.js';
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

export type ChatTopTabsNavigationHelpers =
  MaterialTopTabNavigationHelpers<ScreenParamList>;

const ChatThreadsTopTab = createMaterialTopTabNavigator<
  ScreenParamList,
  ChatTopTabsParamList,
  ChatTopTabsNavigationHelpers,
>();
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
    <ChatThreadsTopTab.Navigator screenOptions={screenOptions} tabBar={TabBar}>
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
  const { state, descriptors, navigation } = useNavigationBuilder<
    StackNavigationState,
    ChatRouterNavigationAction,
    StackOptions,
    StackRouterOptions,
    ChatNavigationHelpers<>,
    StackNavigationEventMap,
    ExtraStackNavigatorProps,
  >(ChatRouter, {
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

const header = (props: StackHeaderProps) => {
  // Flow has trouble reconciling identical types between different libdefs,
  // and flow-typed has no way for one libdef to depend on another
  const castProps: StackHeaderProps = (props: any);
  return <ChatHeader {...castProps} />;
};

const headerRightStyle = { flexDirection: 'row' };

const messageListOptions = ({
  navigation,
  route,
}: {
  +navigation: ChatNavigationProp<'MessageList'>,
  +route: NavigationRoute<'MessageList'>,
}) => {
  const isSearchEmpty =
    !!route.params.searching && route.params.threadInfo.members.length === 1;

  const areSettingsEnabled =
    !threadIsPending(route.params.threadInfo.id) && !isSearchEmpty;

  return {
    headerTitle: (props: HeaderTitleInputProps) => (
      <MessageListHeaderTitle
        threadInfo={route.params.threadInfo}
        navigate={navigation.navigate}
        areSettingsEnabled={areSettingsEnabled}
        isSearchEmpty={isSearchEmpty}
        {...props}
      />
    ),
    headerRight: areSettingsEnabled
      ? () => (
          <View style={headerRightStyle}>
            <SearchMessagesButton
              threadInfo={route.params.threadInfo}
              navigate={navigation.navigate}
            />
            <ThreadSettingsButton
              threadInfo={route.params.threadInfo}
              navigate={navigation.navigate}
            />
          </View>
        )
      : undefined,
    headerBackTitleVisible: false,
    headerTitleAlign: isSearchEmpty ? 'center' : 'left',
    headerLeftContainerStyle: { width: Platform.OS === 'ios' ? 32 : 40 },
    headerTitleStyle: areSettingsEnabled ? { marginRight: 20 } : undefined,
  };
};
const composeThreadOptions = {
  headerTitle: 'Compose chat',
  headerBackTitleVisible: false,
};
const threadSettingsOptions = ({
  route,
}: {
  +route: NavigationRoute<'ThreadSettings'>,
  ...
}) => ({
  headerTitle: (props: HeaderTitleInputProps) => (
    <ThreadSettingsHeaderTitle
      threadInfo={route.params.threadInfo}
      {...props}
    />
  ),
  headerBackTitleVisible: false,
});
const emojiAvatarCreationOptions = {
  headerTitle: 'Emoji avatar selection',
  headerBackTitleVisible: false,
};
const fullScreenThreadMediaGalleryOptions = {
  headerTitle: 'All Media',
  headerBackTitleVisible: false,
};
const deleteThreadOptions = {
  headerTitle: 'Delete chat',
  headerBackTitleVisible: false,
};
const messageSearchOptions = {
  headerTitle: () => <SearchHeader />,
  headerBackTitleVisible: false,
  headerTitleContainerStyle: {
    width: '100%',
  },
};
const pinnedMessagesScreenOptions = {
  headerTitle: 'Pinned Messages',
  headerBackTitleVisible: false,
};
const threadSettingsNotificationsOptions = ({
  route,
}: {
  +route: NavigationRoute<'ThreadSettingsNotifications'>,
  ...
}) => ({
  headerTitle: threadIsSidebar(route.params.threadInfo)
    ? threadSettingsNotificationsCopy.SIDEBAR_TITLE
    : threadSettingsNotificationsCopy.CHANNEL_TITLE,
  headerBackTitleVisible: false,
});
const changeRolesScreenOptions = ({
  route,
}: {
  +route: NavigationRoute<'ChangeRolesScreen'>,
  ...
}) => ({
  headerLeft: (headerLeftProps: StackHeaderLeftButtonProps) => (
    <ChangeRolesHeaderLeftButton {...headerLeftProps} route={route} />
  ),
  headerTitle: 'Change Role',
  presentation: 'modal',
  ...transitionPreset,
});

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

const communityDrawerButtonOnLayout = () => {};

type Props = {
  +navigation: TabNavigationProp<'Chat'>,
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

  const tipsContext = React.useContext(NUXTipsContext);
  invariant(tipsContext, 'NUXTipsContext should be defined');
  const { registerTipButton } = tipsContext;

  const communityDrawerButtonRegisterRef: ReactRefSetter<
    React.ElementRef<typeof View>,
  > = React.useCallback(
    element => {
      const measure = (callback: MeasureOnSuccessCallback) =>
        element?.measure(callback);

      registerTipButton(nuxTip.COMMUNITY_DRAWER, measure);
      registerTipButton(nuxTip.COMMUNITY_DIRECTORY, measure);
    },
    [registerTipButton],
  );

  const headerLeftButton = React.useCallback(
    (headerProps: StackHeaderLeftButtonProps) => {
      if (headerProps.canGoBack) {
        return <HeaderBackButton {...headerProps} />;
      }
      return (
        <View
          onLayout={communityDrawerButtonOnLayout}
          ref={communityDrawerButtonRegisterRef}
        >
          <CommunityDrawerButton navigation={props.navigation} />
        </View>
      );
    },
    [communityDrawerButtonRegisterRef, props.navigation],
  );

  const messageEditingContext = React.useContext(MessageEditingContext);
  const editState = messageEditingContext?.editState;
  const editMode = !!editState?.editedMessage;

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
      gestureResponseDistance: editMode ? 0 : screenWidth,
    }),
    [colors.tabBarBackground, headerLeftButton, screenWidth, editMode],
  );

  const chatThreadListOptions = React.useCallback(
    ({
      navigation,
    }: {
      +navigation: ChatNavigationProp<'ChatThreadList'>,
      ...
    }) => ({
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

  const frozen = useSelector(state => state.frozen);
  const navContext = React.useContext(NavContext);
  const activeThreadID = activeThreadSelector(navContext);

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
            name={EmojiThreadAvatarCreationRouteName}
            component={EmojiThreadAvatarCreation}
            options={emojiAvatarCreationOptions}
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
          <Chat.Screen
            name={PinnedMessagesScreenRouteName}
            component={PinnedMessagesScreen}
            options={pinnedMessagesScreenOptions}
          />
          <Chat.Screen
            name={MessageSearchRouteName}
            component={MessageSearch}
            options={messageSearchOptions}
          />
          <Chat.Screen
            name={ChangeRolesScreenRouteName}
            component={ChangeRolesScreen}
            options={changeRolesScreenOptions}
          />
          <Chat.Screen
            name={ThreadSettingsNotificationsRouteName}
            component={ThreadSettingsNotifications}
            options={threadSettingsNotificationsOptions}
          />
        </Chat.Navigator>
        <MessageStorePruner frozen={frozen} activeThreadID={activeThreadID} />
        <ThreadScreenPruner />
        <NUXHandler />
        {draftUpdater}
      </KeyboardAvoidingView>
    </View>
  );
}
