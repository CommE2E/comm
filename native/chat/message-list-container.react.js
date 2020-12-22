// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import {
  type ChatMessageItem,
  messageListData,
} from 'lib/selectors/chat-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
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
import { type ThreadInfo } from 'lib/types/thread-types';
import type { AccountUserInfo, UserListItem } from 'lib/types/user-types';

import ContentLoading from '../components/content-loading.react';
import NodeHeightMeasurer from '../components/node-height-measurer.react';
import TagInput from '../components/tag-input.react';
import UserList from '../components/user-list.react';
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
import { dummyNodeForTextMessageHeightMeasurement } from './inner-text-message.react';
import {
  MessageListContext,
  useMessageListContext,
} from './message-list-types';
import MessageList from './message-list.react';
import type { ChatMessageInfoItemWithHeight } from './message.react';
import { multimediaMessageContentSizes } from './multimedia-message.react';
import { dummyNodeForRobotextMessageHeightMeasurement } from './robotext-message.react';
export type ChatMessageItemWithHeight =
  | {| itemType: 'loader' |}
  | ChatMessageInfoItemWithHeight;

const inputProps = {
  placeholder: 'username',
  autoFocus: true,
  returnKeyType: 'go',
};

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

  tagDataLabelExtractor = (userInfo: AccountUserInfo) => userInfo.username;

  onUserSelect = (userID: string) => {
    for (const existingUserInfo of this.props.userInfoInputArray) {
      if (userID === existingUserInfo.id) {
        return;
      }
    }
    const userInfoInputArray = [
      ...this.props.userInfoInputArray,
      this.props.otherUserInfos[userID],
    ];
    this.props.updateUsernameInput('');
    this.props.updateTagInput(userInfoInputArray);
  };

  render() {
    const { threadInfo, styles } = this.props;
    const { listDataWithHeights } = this.state;

    const separator =
      this.props.userSearchResults.length > 0 ? (
        <View style={styles.separator} />
      ) : null;

    let searchComponent = null;
    if (this.props.route.params.searching) {
      searchComponent = (
        <>
          <View style={styles.userSelection}>
            <View style={styles.tagInputContainer}>
              <Text style={styles.tagInputLabel}>To: </Text>
              <View style={styles.tagInput}>
                <TagInput
                  value={this.props.userInfoInputArray}
                  onChange={this.props.updateTagInput}
                  text={this.props.usernameInputText}
                  onChangeText={this.props.updateUsernameInput}
                  labelExtractor={this.tagDataLabelExtractor}
                  inputProps={inputProps}
                />
              </View>
            </View>
            <View style={styles.userList}>
              <UserList
                userInfos={this.props.userSearchResults}
                onSelect={this.onUserSelect}
              />
            </View>
          </View>
          {separator}
        </>
      );
    }

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
        <View style={styles.threadContent}>
          {messageList}
          <ChatInputBar
            threadInfo={threadInfo}
            navigation={this.props.navigation}
            route={this.props.route}
          />
        </View>
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
  userSelection: {
    backgroundColor: 'panelBackground',
    maxHeight: 500,
  },
  threadContent: {
    flex: 1,
  },
  tagInputLabel: {
    color: 'modalForegroundSecondaryLabel',
    fontSize: 16,
    paddingLeft: 12,
  },
  tagInputContainer: {
    alignItems: 'center',
    backgroundColor: 'modalForeground',
    borderBottomWidth: 1,
    borderColor: 'modalForegroundBorder',
    flexDirection: 'row',
    paddingVertical: 6,
  },
  tagInput: {
    flex: 1,
  },
  userList: {
    backgroundColor: 'modalBackground',
    paddingLeft: 35,
    paddingRight: 12,
  },
  separator: {
    height: 1,
    backgroundColor: 'modalForegroundBorder',
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

  const inputState = React.useContext(InputStateContext);
  const hideSearch = React.useCallback(() => {
    setOriginalThreadInfo(threadInfoRef.current);
    props.navigation.setParams({
      searching: false,
    });
  }, [props.navigation]);
  React.useEffect(() => {
    if (!props.route.params.searching) {
      return;
    }
    inputState?.registerSendCallback(hideSearch);
    return () => inputState?.unregisterSendCallback(hideSearch);
  }, [hideSearch, inputState, props.route.params.searching]);

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

  const latestThreadInfo = React.useMemo((): ?ThreadInfo => {
    const threadInfoFromParams = originalThreadInfo;
    const threadInfoFromStore = threadInfos[threadInfoFromParams.id];

    if (threadInfoFromStore) {
      return threadInfoFromStore;
    } else if (!viewerID || !threadIsPending(threadInfoFromParams.id)) {
      return undefined;
    }

    const pendingThreadMemberIDs = props.route.params.searching
      ? [...userInfoInputArray.map((user) => user.id), viewerID]
      : threadInfoFromParams.members.map((member) => member.id);
    const threadKey = getPendingThreadKey(pendingThreadMemberIDs);

    if (threadCandidates.get(threadKey)) {
      return threadCandidates.get(threadKey);
    }

    const updatedThread = props.route.params.searching
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
    props.route.params.searching,
    userInfoInputArray,
    threadCandidates,
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
  const boundMessageListData = useSelector(messageListData(threadID));
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
        messageListData={boundMessageListData}
        composedMessageMaxWidth={composedMessageMaxWidth}
        colors={colors}
        styles={styles}
        inputState={inputState}
        overlayContext={overlayContext}
      />
    </MessageListContext.Provider>
  );
});
