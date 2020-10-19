// @flow

import { messageTypes } from 'lib/types/message-types';
import {
  type ThreadInfo,
  threadInfoPropType,
  type RelativeMemberInfo,
  relativeMemberInfoPropType,
} from 'lib/types/thread-types';
import type { ChatMessageInfoItemWithHeight } from './message.react';
import {
  messageListRoutePropType,
  messageListNavPropType,
} from './message-list-types';
import type { ChatNavigationProp } from './chat.react';
import type { NavigationRoute } from '../navigation/route-names';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View } from 'react-native';
import invariant from 'invariant';
import { useSelector } from 'react-redux';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  type ChatMessageItem,
  chatMessageItemPropType,
  messageListData,
} from 'lib/selectors/chat-selectors';
import { messageID } from 'lib/shared/message-utils';
import { relativeMemberInfoSelectorForMembersOfThread } from 'lib/selectors/user-selectors';

import MessageList from './message-list.react';
import NodeHeightMeasurer from '../components/node-height-measurer.react';
import ChatInputBar from './chat-input-bar.react';
import { multimediaMessageContentSizes } from './multimedia-message.react';
import { composedMessageMaxWidthSelector } from './composed-message-width';
import {
  type InputState,
  inputStatePropType,
  InputStateContext,
} from '../input/input-state';
import {
  type Colors,
  colorsPropType,
  useColors,
  useStyles,
} from '../themes/colors';
import ContentLoading from '../components/content-loading.react';
import { dummyNodeForTextMessageHeightMeasurement } from './inner-text-message.react';
import { dummyNodeForRobotextMessageHeightMeasurement } from './robotext-message.react';
import { chatMessageItemKey } from './chat-list.react';
import {
  OverlayContext,
  type OverlayContextType,
  overlayContextPropType,
} from '../navigation/overlay-context';

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
  +threadInfo: ?ThreadInfo,
  +threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
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
  static propTypes = {
    navigation: messageListNavPropType.isRequired,
    route: messageListRoutePropType.isRequired,
    threadInfo: threadInfoPropType,
    threadMembers: PropTypes.arrayOf(relativeMemberInfoPropType).isRequired,
    messageListData: PropTypes.arrayOf(chatMessageItemPropType).isRequired,
    composedMessageMaxWidth: PropTypes.number.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    inputState: inputStatePropType,
    overlayContext: overlayContextPropType,
  };
  state = {
    listDataWithHeights: null,
  };
  pendingListDataWithHeights: ?$ReadOnlyArray<ChatMessageItemWithHeight>;

  static getThreadInfo(props: Props): ThreadInfo {
    const { threadInfo } = props;
    if (threadInfo) {
      return threadInfo;
    }
    return props.route.params.threadInfo;
  }

  get frozen() {
    const { overlayContext } = this.props;
    invariant(
      overlayContext,
      'MessageListContainer should have OverlayContext',
    );
    return overlayContext.scrollBlockingModalStatus !== 'closed';
  }

  componentDidUpdate(prevProps: Props) {
    const oldReduxThreadInfo = prevProps.threadInfo;
    const newReduxThreadInfo = this.props.threadInfo;
    if (newReduxThreadInfo && newReduxThreadInfo !== oldReduxThreadInfo) {
      this.props.navigation.setParams({ threadInfo: newReduxThreadInfo });
    }

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
    const threadInfo = MessageListContainer.getThreadInfo(this.props);
    const { listDataWithHeights } = this.state;

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
      <View style={this.props.styles.container}>
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
        {messageList}
        <ChatInputBar
          threadInfo={threadInfo}
          navigation={this.props.navigation}
          route={this.props.route}
        />
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
      return dummyNodeForTextMessageHeightMeasurement(
        messageInfo.text,
        this.props.threadMembers,
      );
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
    const threadInfo = MessageListContainer.getThreadInfo(this.props);
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
};

export default React.memo<BaseProps>(function ConnectedMessageListContainer(
  props: BaseProps,
) {
  const threadID = props.route.params.threadInfo.id;
  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);
  const threadMembers = useSelector(state =>
    relativeMemberInfoSelectorForMembersOfThread(threadID)(state),
  );
  const boundMessageListData = useSelector(state =>
    messageListData(threadID)(state),
  );
  const composedMessageMaxWidth = useSelector(composedMessageMaxWidthSelector);
  const colors = useColors();
  const styles = useStyles(unboundStyles);
  const inputState = React.useContext(InputStateContext);
  const overlayContext = React.useContext(OverlayContext);
  return (
    <MessageListContainer
      {...props}
      threadInfo={threadInfo}
      threadMembers={threadMembers}
      messageListData={boundMessageListData}
      composedMessageMaxWidth={composedMessageMaxWidth}
      colors={colors}
      styles={styles}
      inputState={inputState}
      overlayContext={overlayContext}
    />
  );
});
