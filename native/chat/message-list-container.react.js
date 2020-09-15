// @flow

import type { AppState } from '../redux/redux-setup';
import { messageTypes } from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
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

import { connect } from 'lib/utils/redux-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  type ChatMessageItem,
  chatMessageItemPropType,
  messageListData,
} from 'lib/selectors/chat-selectors';
import { messageID } from 'lib/shared/message-utils';

import MessageList from './message-list.react';
import NodeHeightMeasurer from '../components/node-height-measurer.react';
import ChatInputBar from './chat-input-bar.react';
import { multimediaMessageContentSizes } from './multimedia-message.react';
import { composedMessageMaxWidthSelector } from './composed-message-width';
import {
  type InputState,
  inputStatePropType,
  withInputState,
} from '../input/input-state';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';
import ContentLoading from '../components/content-loading.react';
import { dummyNodeForTextMessageHeightMeasurement } from './inner-text-message.react';
import { dummyNodeForRobotextMessageHeightMeasurement } from './robotext-message.react';
import { chatMessageItemKey } from './chat-list.react';

export type ChatMessageItemWithHeight =
  | {| itemType: 'loader' |}
  | ChatMessageInfoItemWithHeight;

type Props = {|
  navigation: ChatNavigationProp<'MessageList'>,
  route: NavigationRoute<'MessageList'>,
  // Redux state
  threadInfo: ?ThreadInfo,
  messageListData: $ReadOnlyArray<ChatMessageItem>,
  composedMessageMaxWidth: number,
  colors: Colors,
  styles: typeof styles,
  // withInputState
  inputState: ?InputState,
|};
type State = {|
  listDataWithHeights: ?$ReadOnlyArray<ChatMessageItemWithHeight>,
|};
class MessageListContainer extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: messageListNavPropType.isRequired,
    route: messageListRoutePropType.isRequired,
    threadInfo: threadInfoPropType,
    messageListData: PropTypes.arrayOf(chatMessageItemPropType).isRequired,
    composedMessageMaxWidth: PropTypes.number.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    inputState: inputStatePropType,
  };
  state = {
    listDataWithHeights: null,
  };

  static getThreadInfo(props: Props): ThreadInfo {
    const { threadInfo } = props;
    if (threadInfo) {
      return threadInfo;
    }
    return props.route.params.threadInfo;
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
    this.setState({ listDataWithHeights });
  };
}

const styles = {
  container: {
    backgroundColor: 'listBackground',
    flex: 1,
  },
};
const stylesSelector = styleSelector(styles);

export default connect(
  (state: AppState, ownProps: { route: NavigationRoute<'MessageList'> }) => {
    const threadID = ownProps.route.params.threadInfo.id;
    return {
      threadInfo: threadInfoSelector(state)[threadID],
      messageListData: messageListData(threadID)(state),
      composedMessageMaxWidth: composedMessageMaxWidthSelector(state),
      colors: colorsSelector(state),
      styles: stylesSelector(state),
    };
  },
)(withInputState(MessageListContainer));
