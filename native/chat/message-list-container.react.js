// @flow

import { useNavigationState } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';

import genesis from 'lib/facts/genesis.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import {
  userInfoSelectorForPotentialMembers,
  userSearchIndexForPotentialMembers,
} from 'lib/selectors/user-selectors.js';
import { getPotentialMemberItems } from 'lib/shared/search-utils.js';
import {
  useExistingThreadInfoFinder,
  pendingThreadType,
} from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import type { AccountUserInfo, UserListItem } from 'lib/types/user-types.js';

import { type MessagesMeasurer, useHeightMeasurer } from './chat-context.js';
import { ChatInputBar } from './chat-input-bar.react.js';
import type { ChatNavigationProp } from './chat.react.js';
import {
  type NativeChatMessageItem,
  useNativeMessageListData,
} from './message-data.react.js';
import MessageListThreadSearch from './message-list-thread-search.react.js';
import { MessageListContextProvider } from './message-list-types.js';
import MessageList from './message-list.react.js';
import ParentThreadHeader from './parent-thread-header.react.js';
import ContentLoading from '../components/content-loading.react.js';
import { InputStateContext } from '../input/input-state.js';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { ThreadSettingsRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { type Colors, useColors, useStyles } from '../themes/colors.js';
import type { ChatMessageItemWithHeight } from '../types/chat-types.js';

type BaseProps = {
  +navigation: ChatNavigationProp<'MessageList'>,
  +route: NavigationRoute<'MessageList'>,
};
type Props = {
  ...BaseProps,
  // Redux state
  +usernameInputText: string,
  +updateUsernameInput: (text: string) => void,
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
  +updateTagInput: (items: $ReadOnlyArray<AccountUserInfo>) => void,
  +resolveToUser: (user: AccountUserInfo) => void,
  +otherUserInfos: { [id: string]: AccountUserInfo },
  +userSearchResults: $ReadOnlyArray<UserListItem>,
  +threadInfo: ThreadInfo,
  +genesisThreadInfo: ?ThreadInfo,
  +messageListData: ?$ReadOnlyArray<NativeChatMessageItem>,
  +colors: Colors,
  +styles: typeof unboundStyles,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  +measureMessages: MessagesMeasurer,
};
type State = {
  +listDataWithHeights: ?$ReadOnlyArray<ChatMessageItemWithHeight>,
};
class MessageListContainer extends React.PureComponent<Props, State> {
  state: State = {
    listDataWithHeights: null,
  };
  pendingListDataWithHeights: ?$ReadOnlyArray<ChatMessageItemWithHeight>;

  get frozen() {
    const { overlayContext } = this.props;
    invariant(
      overlayContext,
      'MessageListContainer should have OverlayContext',
    );
    return overlayContext.scrollBlockingModalStatus !== 'closed';
  }

  setListData = (
    listDataWithHeights: $ReadOnlyArray<ChatMessageItemWithHeight>,
  ) => {
    this.setState({ listDataWithHeights });
  };

  componentDidMount() {
    this.props.measureMessages(
      this.props.messageListData,
      this.props.threadInfo,
      this.setListData,
    );
  }

  componentDidUpdate(prevProps: Props) {
    const oldListData = prevProps.messageListData;
    const newListData = this.props.messageListData;
    if (!newListData && oldListData) {
      this.setState({ listDataWithHeights: null });
    }

    if (
      oldListData !== newListData ||
      prevProps.threadInfo !== this.props.threadInfo ||
      prevProps.measureMessages !== this.props.measureMessages
    ) {
      this.props.measureMessages(
        newListData,
        this.props.threadInfo,
        this.allHeightsMeasured,
      );
    }

    if (!this.frozen && this.pendingListDataWithHeights) {
      this.setState({ listDataWithHeights: this.pendingListDataWithHeights });
      this.pendingListDataWithHeights = undefined;
    }
  }

  render() {
    const { threadInfo, styles } = this.props;
    const { listDataWithHeights } = this.state;
    const { searching } = this.props.route.params;

    let searchComponent = null;
    if (searching) {
      const { userInfoInputArray, genesisThreadInfo } = this.props;
      // It's technically possible for the client to be missing the Genesis
      // ThreadInfo when it first opens up (before the server delivers it)
      let parentThreadHeader;
      if (genesisThreadInfo) {
        parentThreadHeader = (
          <ParentThreadHeader
            parentThreadInfo={genesisThreadInfo}
            childThreadType={pendingThreadType(userInfoInputArray.length)}
          />
        );
      }
      searchComponent = (
        <>
          {parentThreadHeader}
          <MessageListThreadSearch
            usernameInputText={this.props.usernameInputText}
            updateUsernameInput={this.props.updateUsernameInput}
            userInfoInputArray={userInfoInputArray}
            updateTagInput={this.props.updateTagInput}
            resolveToUser={this.props.resolveToUser}
            otherUserInfos={this.props.otherUserInfos}
            userSearchResults={this.props.userSearchResults}
          />
        </>
      );
    }

    const showMessageList =
      !searching || this.props.userInfoInputArray.length > 0;
    let messageList;
    if (showMessageList && listDataWithHeights) {
      messageList = (
        <MessageList
          threadInfo={threadInfo}
          messageListData={listDataWithHeights}
          navigation={this.props.navigation}
          route={this.props.route}
        />
      );
    } else if (showMessageList) {
      messageList = (
        <ContentLoading fillType="flex" colors={this.props.colors} />
      );
    }
    const threadContentStyles = showMessageList
      ? [styles.threadContent]
      : [styles.hiddenThreadContent];
    const pointerEvents = showMessageList ? 'auto' : 'none';
    const threadContent = (
      <View style={threadContentStyles} pointerEvents={pointerEvents}>
        {messageList}
        <ChatInputBar
          threadInfo={threadInfo}
          navigation={this.props.navigation}
          route={this.props.route}
        />
      </View>
    );

    return (
      <View style={styles.container}>
        {searchComponent}
        {threadContent}
      </View>
    );
  }

  allHeightsMeasured = (
    listDataWithHeights: $ReadOnlyArray<ChatMessageItemWithHeight>,
  ) => {
    if (this.frozen) {
      this.pendingListDataWithHeights = listDataWithHeights;
    } else {
      this.setState({ listDataWithHeights });
    }
  };
}

const unboundStyles = {
  container: {
    backgroundColor: 'listBackground',
    flex: 1,
  },
  threadContent: {
    flex: 1,
  },
  hiddenThreadContent: {
    height: 0,
    opacity: 0,
  },
};

const ConnectedMessageListContainer: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedMessageListContainer(
    props: BaseProps,
  ) {
    const [usernameInputText, setUsernameInputText] = React.useState('');
    const [userInfoInputArray, setUserInfoInputArray] = React.useState<
      $ReadOnlyArray<AccountUserInfo>,
    >([]);

    const otherUserInfos = useSelector(userInfoSelectorForPotentialMembers);
    const userSearchIndex = useSelector(userSearchIndexForPotentialMembers);
    const userSearchResults = React.useMemo(
      () =>
        getPotentialMemberItems(
          usernameInputText,
          otherUserInfos,
          userSearchIndex,
          userInfoInputArray.map(userInfo => userInfo.id),
        ),
      [usernameInputText, otherUserInfos, userSearchIndex, userInfoInputArray],
    );

    const [baseThreadInfo, setBaseThreadInfo] = React.useState(
      props.route.params.threadInfo,
    );

    const existingThreadInfoFinder =
      useExistingThreadInfoFinder(baseThreadInfo);

    const isSearching = !!props.route.params.searching;
    const threadInfo = React.useMemo(
      () =>
        existingThreadInfoFinder({
          searching: isSearching,
          userInfoInputArray,
        }),
      [existingThreadInfoFinder, isSearching, userInfoInputArray],
    );
    invariant(
      threadInfo,
      'threadInfo must be specified in messageListContainer',
    );

    const inputState = React.useContext(InputStateContext);
    invariant(inputState, 'inputState should be set in MessageListContainer');

    const isFocused = props.navigation.isFocused();
    const { setPendingThreadUpdateHandler } = inputState;
    React.useEffect(() => {
      if (!isFocused) {
        return;
      }
      setPendingThreadUpdateHandler(threadInfo.id, setBaseThreadInfo);
      return () => {
        setPendingThreadUpdateHandler(threadInfo.id, undefined);
      };
    }, [setPendingThreadUpdateHandler, isFocused, threadInfo.id]);

    const { setParams } = props.navigation;
    const navigationStack = useNavigationState(state => state.routes);
    React.useEffect(() => {
      const topRoute = navigationStack[navigationStack.length - 1];
      if (topRoute?.name !== ThreadSettingsRouteName) {
        return;
      }
      setBaseThreadInfo(threadInfo);
      if (isSearching) {
        setParams({ searching: false });
      }
    }, [isSearching, navigationStack, setParams, threadInfo]);

    const hideSearch = React.useCallback(() => {
      setBaseThreadInfo(threadInfo);
      setParams({ searching: false });
    }, [setParams, threadInfo]);
    React.useEffect(() => {
      if (!isSearching) {
        return;
      }
      inputState.registerSendCallback(hideSearch);
      return () => inputState.unregisterSendCallback(hideSearch);
    }, [hideSearch, inputState, isSearching]);

    React.useEffect(() => {
      setParams({ threadInfo });
    }, [setParams, threadInfo]);

    const updateTagInput = React.useCallback(
      (input: $ReadOnlyArray<AccountUserInfo>) => setUserInfoInputArray(input),
      [],
    );
    const updateUsernameInput = React.useCallback(
      (text: string) => setUsernameInputText(text),
      [],
    );
    const { editInputMessage } = inputState;
    const resolveToUser = React.useCallback(
      (user: AccountUserInfo) => {
        const resolvedThreadInfo = existingThreadInfoFinder({
          searching: true,
          userInfoInputArray: [user],
        });
        invariant(
          resolvedThreadInfo,
          'resolvedThreadInfo must be specified in messageListContainer',
        );
        editInputMessage({ message: '', mode: 'prepend' });
        setBaseThreadInfo(resolvedThreadInfo);
        setParams({ searching: false, threadInfo: resolvedThreadInfo });
      },
      [existingThreadInfoFinder, editInputMessage, setParams],
    );

    const messageListData = useNativeMessageListData({
      searching: isSearching,
      userInfoInputArray,
      threadInfo,
    });
    const colors = useColors();
    const styles = useStyles(unboundStyles);
    const overlayContext = React.useContext(OverlayContext);
    const measureMessages = useHeightMeasurer();

    const genesisThreadInfo = useSelector(
      state => threadInfoSelector(state)[genesis.id],
    );

    return (
      <MessageListContextProvider threadInfo={threadInfo}>
        <MessageListContainer
          {...props}
          usernameInputText={usernameInputText}
          updateUsernameInput={updateUsernameInput}
          userInfoInputArray={userInfoInputArray}
          updateTagInput={updateTagInput}
          resolveToUser={resolveToUser}
          otherUserInfos={otherUserInfos}
          userSearchResults={userSearchResults}
          threadInfo={threadInfo}
          genesisThreadInfo={genesisThreadInfo}
          messageListData={messageListData}
          colors={colors}
          styles={styles}
          overlayContext={overlayContext}
          measureMessages={measureMessages}
        />
      </MessageListContextProvider>
    );
  });

export default ConnectedMessageListContainer;
