// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';

import {
  type ChatMessageItem,
  messageListData as messageListDataSelector,
  messageInfoSelector,
  getSourceMessageChatItemForPendingSidebar,
} from 'lib/selectors/chat-selectors';
import {
  threadInfoSelector,
  threadInfoFromSourceMessageIDSelector,
} from 'lib/selectors/thread-selectors';
import {
  userInfoSelectorForPotentialMembers,
  userSearchIndexForPotentialMembers,
} from 'lib/selectors/user-selectors';
import { messageID } from 'lib/shared/message-utils';
import { getPotentialMemberItems } from 'lib/shared/search-utils';
import {
  createPendingThread,
  getCurrentUser,
  getPendingThreadKey,
  pendingThreadType,
  threadHasAdminRole,
  threadIsPending,
} from 'lib/shared/thread-utils';
import { messageTypes } from 'lib/types/message-types';
import { type ThreadInfo, threadTypes } from 'lib/types/thread-types';
import type { AccountUserInfo, UserListItem } from 'lib/types/user-types';

import ContentLoading from '../components/content-loading.react';
import NodeHeightMeasurer from '../components/node-height-measurer.react';
import { type InputState, InputStateContext } from '../input/input-state';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context';
import type { NavigationRoute } from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils';
import { type Colors, useColors, useStyles } from '../themes/colors';
import ChatInputBar from './chat-input-bar.react';
import { chatMessageItemKey } from './chat-list.react';
import type { ChatNavigationProp } from './chat.react';
import { composedMessageMaxWidthSelector } from './composed-message-width';
import { dummyNodeForRobotextMessageHeightMeasurement } from './inner-robotext-message.react';
import { dummyNodeForTextMessageHeightMeasurement } from './inner-text-message.react';
import MessageListThreadSearch from './message-list-thread-search.react';
import {
  MessageListContext,
  useMessageListContext,
} from './message-list-types';
import MessageList from './message-list.react';
import type { ChatMessageInfoItemWithHeight } from './message.react';
import { multimediaMessageContentSizes } from './multimedia-message.react';
export type ChatMessageItemWithHeight =
  | {| itemType: 'loader' |}
  | ChatMessageInfoItemWithHeight;

type BaseProps = {|
  +navigation: ChatNavigationProp<'MessageList'>,
  +route: NavigationRoute<'MessageList'>,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +usernameInputText: string,
  +updateUsernameInput: (text: string) => void,
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
  +updateTagInput: (items: $ReadOnlyArray<AccountUserInfo>) => void,
  +otherUserInfos: { [id: string]: AccountUserInfo },
  +userSearchResults: $ReadOnlyArray<UserListItem>,
  +threadInfo: ThreadInfo,
  +messageListData: $ReadOnlyArray<ChatMessageItem>,
  +composedMessageMaxWidth: number,
  +colors: Colors,
  +styles: typeof unboundStyles,
  // withInputState
  +inputState: ?InputState,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
|};
type State = {|
  +listDataWithHeights: ?$ReadOnlyArray<ChatMessageItemWithHeight>,
|};
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

  componentDidUpdate(prevProps: Props) {
    const oldListData = prevProps.messageListData;
    const newListData = this.props.messageListData;
    if (!newListData && oldListData) {
      this.setState({ listDataWithHeights: null });
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
      searchComponent = (
        <MessageListThreadSearch
          usernameInputText={this.props.usernameInputText}
          updateUsernameInput={this.props.updateUsernameInput}
          userInfoInputArray={this.props.userInfoInputArray}
          updateTagInput={this.props.updateTagInput}
          otherUserInfos={this.props.otherUserInfos}
          userSearchResults={this.props.userSearchResults}
        />
      );
    }

    const showMessageList =
      !searching || this.props.userInfoInputArray.length > 0;
    let threadContent = null;
    if (showMessageList) {
      let messageList;
      if (listDataWithHeights) {
        messageList = (
          <MessageList
            threadInfo={threadInfo}
            messageListData={listDataWithHeights}
            navigation={this.props.navigation}
            route={this.props.route}
          />
        );
      } else {
        messageList = (
          <ContentLoading fillType="flex" colors={this.props.colors} />
        );
      }

      threadContent = (
        <View style={styles.threadContent}>
          {messageList}
          <ChatInputBar
            threadInfo={threadInfo}
            navigation={this.props.navigation}
            route={this.props.route}
          />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <NodeHeightMeasurer
          listData={this.props.messageListData}
          itemToID={this.heightMeasurerID}
          itemToMeasureKey={this.heightMeasurerKey}
          itemToDummy={this.heightMeasurerDummy}
          mergeItemWithHeight={this.heightMeasurerMergeItem}
          allHeightsMeasured={this.allHeightsMeasured}
          inputState={this.props.inputState}
          composedMessageMaxWidth={this.props.composedMessageMaxWidth}
        />
        {searchComponent}
        {threadContent}
      </View>
    );
  }

  heightMeasurerID = (item: ChatMessageItem) => {
    return chatMessageItemKey(item);
  };

  heightMeasurerKey = (item: ChatMessageItem) => {
    if (item.itemType !== 'message') {
      return null;
    }
    const { messageInfo } = item;
    if (messageInfo.type === messageTypes.TEXT) {
      return messageInfo.text;
    } else if (item.robotext && typeof item.robotext === 'string') {
      return item.robotext;
    }
    return null;
  };

  heightMeasurerDummy = (item: ChatMessageItem) => {
    invariant(
      item.itemType === 'message',
      'NodeHeightMeasurer asked for dummy for non-message item',
    );
    const { messageInfo } = item;
    if (messageInfo.type === messageTypes.TEXT) {
      return dummyNodeForTextMessageHeightMeasurement(messageInfo.text);
    } else if (item.robotext && typeof item.robotext === 'string') {
      return dummyNodeForRobotextMessageHeightMeasurement(item.robotext);
    }
    invariant(false, 'NodeHeightMeasurer asked for dummy for non-text message');
  };

  heightMeasurerMergeItem = (item: ChatMessageItem, height: ?number) => {
    if (item.itemType !== 'message') {
      return item;
    }

    const { messageInfo } = item;
    invariant(
      messageInfo.type !== messageTypes.SIDEBAR_SOURCE,
      'Sidebar source messages should be replaced by sourceMessage before being measured',
    );
    const { threadInfo } = this.props;
    if (
      messageInfo.type === messageTypes.IMAGES ||
      messageInfo.type === messageTypes.MULTIMEDIA
    ) {
      const { inputState } = this.props;
      // Conditional due to Flow...
      const localMessageInfo = item.localMessageInfo
        ? item.localMessageInfo
        : null;
      const id = messageID(messageInfo);
      const pendingUploads =
        inputState &&
        inputState.pendingUploads &&
        inputState.pendingUploads[id];
      const sizes = multimediaMessageContentSizes(
        messageInfo,
        this.props.composedMessageMaxWidth,
      );
      return {
        itemType: 'message',
        messageShapeType: 'multimedia',
        messageInfo,
        localMessageInfo,
        threadInfo,
        startsConversation: item.startsConversation,
        startsCluster: item.startsCluster,
        endsCluster: item.endsCluster,
        threadCreatedFromMessage: item.threadCreatedFromMessage,
        pendingUploads,
        ...sizes,
      };
    }

    invariant(height !== null && height !== undefined, 'height should be set');
    if (messageInfo.type === messageTypes.TEXT) {
      // Conditional due to Flow...
      const localMessageInfo = item.localMessageInfo
        ? item.localMessageInfo
        : null;
      return {
        itemType: 'message',
        messageShapeType: 'text',
        messageInfo,
        localMessageInfo,
        threadInfo,
        startsConversation: item.startsConversation,
        startsCluster: item.startsCluster,
        endsCluster: item.endsCluster,
        threadCreatedFromMessage: item.threadCreatedFromMessage,
        contentHeight: height,
      };
    } else {
      invariant(
        typeof item.robotext === 'string',
        "Flow can't handle our fancy types :(",
      );
      return {
        itemType: 'message',
        messageShapeType: 'robotext',
        messageInfo,
        threadInfo,
        startsConversation: item.startsConversation,
        startsCluster: item.startsCluster,
        endsCluster: item.endsCluster,
        threadCreatedFromMessage: item.threadCreatedFromMessage,
        robotext: item.robotext,
        contentHeight: height,
      };
    }
  };

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
};

export default React.memo<BaseProps>(function ConnectedMessageListContainer(
  props: BaseProps,
) {
  const viewerID = useSelector(
    (state) => state.currentUserInfo && state.currentUserInfo.id,
  );

  const [usernameInputText, setUsernameInputText] = React.useState('');
  const [userInfoInputArray, setUserInfoInputArray] = React.useState<
    $ReadOnlyArray<AccountUserInfo>,
  >([]);
  const updateTagInput = React.useCallback(
    (input: $ReadOnlyArray<AccountUserInfo>) => setUserInfoInputArray(input),
    [],
  );
  const updateUsernameInput = React.useCallback(
    (text: string) => setUsernameInputText(text),
    [],
  );
  const otherUserInfos = useSelector(userInfoSelectorForPotentialMembers);
  const userSearchIndex = useSelector(userSearchIndexForPotentialMembers);

  const userSearchResults = React.useMemo(
    () =>
      getPotentialMemberItems(
        usernameInputText,
        otherUserInfos,
        userSearchIndex,
        userInfoInputArray.map((userInfo) => userInfo.id),
      ),
    [usernameInputText, otherUserInfos, userSearchIndex, userInfoInputArray],
  );

  const threadInfos = useSelector(threadInfoSelector);
  const userInfos = useSelector((state) => state.userStore.userInfos);
  const threadInfoRef = React.useRef(props.route.params.threadInfo);
  const [originalThreadInfo, setOriginalThreadInfo] = React.useState(
    props.route.params.threadInfo,
  );

  const { searching } = props.route.params;
  const inputState = React.useContext(InputStateContext);
  const hideSearch = React.useCallback(() => {
    setOriginalThreadInfo(threadInfoRef.current);
    props.navigation.setParams({
      searching: false,
    });
  }, [props.navigation]);
  React.useEffect(() => {
    if (!searching) {
      return;
    }
    inputState?.registerSendCallback(hideSearch);
    return () => inputState?.unregisterSendCallback(hideSearch);
  }, [hideSearch, inputState, searching]);

  const threadCandidates = React.useMemo(() => {
    const infos = new Map<string, ThreadInfo>();
    for (const threadID in threadInfos) {
      const info = threadInfos[threadID];
      if (info.parentThreadID || threadHasAdminRole(info)) {
        continue;
      }

      const key = getPendingThreadKey(info.members.map((member) => member.id));
      const indexedThread = infos.get(key);
      if (!indexedThread || info.creationTime < indexedThread.creationTime) {
        infos.set(key, info);
      }
    }
    return infos;
  }, [threadInfos]);

  const { sidebarSourceMessageID } = props.route.params;
  const sidebarCandidate = useSelector((state) => {
    if (!sidebarSourceMessageID) {
      return null;
    }
    return threadInfoFromSourceMessageIDSelector(state)[sidebarSourceMessageID];
  });

  const latestThreadInfo = React.useMemo((): ?ThreadInfo => {
    const threadInfoFromParams = originalThreadInfo;
    const threadInfoFromStore = threadInfos[threadInfoFromParams.id];

    if (threadInfoFromStore) {
      return threadInfoFromStore;
    } else if (!viewerID || !threadIsPending(threadInfoFromParams.id)) {
      return undefined;
    }

    const pendingThreadMemberIDs = searching
      ? [...userInfoInputArray.map((user) => user.id), viewerID]
      : threadInfoFromParams.members.map((member) => member.id);
    const threadKey = getPendingThreadKey(pendingThreadMemberIDs);

    if (
      threadInfoFromParams.type !== threadTypes.SIDEBAR &&
      threadCandidates.get(threadKey)
    ) {
      return threadCandidates.get(threadKey);
    }

    if (sidebarCandidate) {
      return sidebarCandidate;
    }

    const updatedThread = searching
      ? createPendingThread(
          viewerID,
          pendingThreadType(userInfoInputArray.length),
          userInfoInputArray,
        )
      : threadInfoFromParams;
    return {
      ...updatedThread,
      currentUser: getCurrentUser(updatedThread, viewerID, userInfos),
    };
  }, [
    originalThreadInfo,
    threadInfos,
    viewerID,
    searching,
    userInfoInputArray,
    threadCandidates,
    sidebarCandidate,
    userInfos,
  ]);

  if (latestThreadInfo) {
    threadInfoRef.current = latestThreadInfo;
  }

  const threadInfo = threadInfoRef.current;
  const { setParams } = props.navigation;
  React.useEffect(() => {
    setParams({ threadInfo });
  }, [setParams, threadInfo]);

  const threadID = threadInfoRef.current.id;
  const boundMessageListData = useSelector(messageListDataSelector(threadID));
  const sidebarSourceMessageInfo = useSelector((state) =>
    sidebarSourceMessageID && !sidebarCandidate
      ? messageInfoSelector(state)[sidebarSourceMessageID]
      : null,
  );
  invariant(
    !sidebarSourceMessageInfo ||
      sidebarSourceMessageInfo.type !== messageTypes.SIDEBAR_SOURCE,
    'sidebars can not be created from sidebar_source message',
  );
  const messageListData = React.useMemo(() => {
    if (searching && userInfoInputArray.length === 0) {
      return [];
    } else if (sidebarSourceMessageInfo) {
      return [
        getSourceMessageChatItemForPendingSidebar(
          sidebarSourceMessageInfo,
          threadInfos,
        ),
      ];
    }
    return boundMessageListData;
  }, [
    searching,
    userInfoInputArray.length,
    sidebarSourceMessageInfo,
    boundMessageListData,
    threadInfos,
  ]);
  const composedMessageMaxWidth = useSelector(composedMessageMaxWidthSelector);
  const colors = useColors();
  const styles = useStyles(unboundStyles);
  const overlayContext = React.useContext(OverlayContext);
  const messageListContext = useMessageListContext(threadID);
  return (
    <MessageListContext.Provider value={messageListContext}>
      <MessageListContainer
        {...props}
        usernameInputText={usernameInputText}
        updateUsernameInput={updateUsernameInput}
        userInfoInputArray={userInfoInputArray}
        updateTagInput={updateTagInput}
        otherUserInfos={otherUserInfos}
        userSearchResults={userSearchResults}
        threadInfo={threadInfoRef.current}
        messageListData={messageListData}
        composedMessageMaxWidth={composedMessageMaxWidth}
        colors={colors}
        styles={styles}
        inputState={inputState}
        overlayContext={overlayContext}
      />
    </MessageListContext.Provider>
  );
});
