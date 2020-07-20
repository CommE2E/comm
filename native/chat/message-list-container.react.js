// @flow

import type { AppState } from '../redux/redux-setup';
import { messageTypes } from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { NodeToMeasure } from '../components/node-height-measurer.react';
import type { ChatMessageInfoItemWithHeight } from './message.react';
import {
  messageListRoutePropType,
  messageListNavPropType,
} from './message-list-types';
import type { ChatNavigationProp } from './chat.react';
import type { NavigationRoute } from '../navigation/route-names';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, Text } from 'react-native';
import invariant from 'invariant';
import hoistNonReactStatics from 'hoist-non-react-statics';

import { connect } from 'lib/utils/redux-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  type ChatMessageItem,
  chatMessageItemPropType,
  messageListData,
} from 'lib/selectors/chat-selectors';
import {
  messageKey,
  messageID,
  robotextToRawString,
} from 'lib/shared/message-utils';

import MessageList from './message-list.react';
import NodeHeightMeasurer from '../components/node-height-measurer.react';
import ChatInputBar from './chat-input-bar.react';
import { multimediaMessageContentSizes } from './multimedia-message.react';
import {
  textMessageMaxWidthSelector,
  composedMessageMaxWidthSelector,
} from './composed-message-width';
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
import Markdown from '../markdown/markdown.react';
import { fullMarkdownRules } from '../markdown/rules.react';

export type ChatMessageItemWithHeight =
  | {| itemType: 'loader' |}
  | ChatMessageInfoItemWithHeight;

type Props = {|
  navigation: ChatNavigationProp<'MessageList'>,
  route: NavigationRoute<'MessageList'>,
  // Redux state
  threadInfo: ?ThreadInfo,
  messageListData: $ReadOnlyArray<ChatMessageItem>,
  textMessageMaxWidth: number,
  composedMessageMaxWidth: number,
  colors: Colors,
  styles: typeof styles,
  // withInputState
  inputState: ?InputState,
|};
type State = {|
  nodesToMeasure: NodeToMeasure[],
  listDataWithHeights: ?$ReadOnlyArray<ChatMessageItemWithHeight>,
|};
class MessageListContainer extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: messageListNavPropType.isRequired,
    route: messageListRoutePropType.isRequired,
    threadInfo: threadInfoPropType,
    messageListData: PropTypes.arrayOf(chatMessageItemPropType).isRequired,
    textMessageMaxWidth: PropTypes.number.isRequired,
    composedMessageMaxWidth: PropTypes.number.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    inputState: inputStatePropType,
  };

  constructor(props: Props) {
    super(props);
    const nodesToMeasure = props.messageListData
      ? this.nodesToMeasureFromListData(props.messageListData)
      : [];
    const listDataWithHeights =
      props.messageListData && nodesToMeasure.length === 0
        ? this.mergeHeightsIntoListData()
        : null;
    this.state = {
      nodesToMeasure,
      listDataWithHeights,
    };
  }

  nodesToMeasureFromListData(listData: $ReadOnlyArray<ChatMessageItem>) {
    const nodesToMeasure = [];
    for (let item of listData) {
      if (item.itemType !== 'message') {
        continue;
      }
      const { messageInfo } = item;
      if (messageInfo.type === messageTypes.TEXT) {
        const style = [
          this.props.styles.text,
          { width: this.props.textMessageMaxWidth },
        ];
        const node = (
          <Markdown
            style={style}
            useDarkStyle={false}
            rules={fullMarkdownRules}
          >
            {messageInfo.text}
          </Markdown>
        );
        nodesToMeasure.push({
          id: messageKey(messageInfo),
          node,
        });
      } else if (item.robotext && typeof item.robotext === 'string') {
        const node = (
          <Text style={this.props.styles.robotext}>
            {robotextToRawString(item.robotext)}
          </Text>
        );
        nodesToMeasure.push({
          id: messageKey(messageInfo),
          node,
        });
      }
    }
    return nodesToMeasure;
  }

  static getThreadInfo(props: Props): ThreadInfo {
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
      this.setState({
        nodesToMeasure: [],
        listDataWithHeights: null,
      });
    }
    if (!newListData) {
      return;
    }

    const oldNavThreadInfo = MessageListContainer.getThreadInfo(prevProps);
    const newNavThreadInfo = MessageListContainer.getThreadInfo(this.props);
    const oldInputState = prevProps.inputState;
    const newInputState = this.props.inputState;
    if (
      newListData === oldListData &&
      newNavThreadInfo === oldNavThreadInfo &&
      newInputState === oldInputState
    ) {
      return;
    }

    const newNodesToMeasure = this.nodesToMeasureFromListData(newListData);
    this.setState({ nodesToMeasure: newNodesToMeasure });
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
          nodesToMeasure={this.state.nodesToMeasure}
          allHeightsMeasuredCallback={this.allHeightsMeasured}
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

  allHeightsMeasured = (
    nodesToMeasure: $ReadOnlyArray<NodeToMeasure>,
    newHeights: Map<string, number>,
  ) => {
    if (nodesToMeasure !== this.state.nodesToMeasure) {
      return;
    }
    if (!this.props.messageListData) {
      return;
    }
    const listDataWithHeights = this.mergeHeightsIntoListData(newHeights);
    this.setState({ listDataWithHeights });
  };

  mergeHeightsIntoListData(nodeHeights?: Map<string, number>) {
    const { messageListData: listData, inputState } = this.props;
    const threadInfo = MessageListContainer.getThreadInfo(this.props);
    const listDataWithHeights = listData.map((item: ChatMessageItem) => {
      if (item.itemType !== 'message') {
        return item;
      }
      const { messageInfo } = item;
      const key = messageKey(messageInfo);
      if (
        messageInfo.type === messageTypes.IMAGES ||
        messageInfo.type === messageTypes.MULTIMEDIA
      ) {
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
      invariant(nodeHeights, 'nodeHeights not set');
      const contentHeight = nodeHeights.get(key);
      invariant(
        contentHeight !== null && contentHeight !== undefined,
        `height for ${key} should be set`,
      );
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
          contentHeight,
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
          contentHeight,
        };
      }
    });
    return listDataWithHeights;
  }
}

const styles = {
  container: {
    backgroundColor: 'listBackground',
    flex: 1,
  },
  robotext: {
    fontFamily: 'Arial',
    fontSize: 15,
    left: 24,
    right: 24,
  },
  text: {
    fontFamily: 'Arial',
    fontSize: 18,
  },
};
const stylesSelector = styleSelector(styles);

const ConnectedMessageListContainer = connect(
  (state: AppState, ownProps: { route: NavigationRoute<'MessageList'> }) => {
    const threadID = ownProps.route.params.threadInfo.id;
    return {
      threadInfo: threadInfoSelector(state)[threadID],
      messageListData: messageListData(threadID)(state),
      textMessageMaxWidth: textMessageMaxWidthSelector(state),
      composedMessageMaxWidth: composedMessageMaxWidthSelector(state),
      colors: colorsSelector(state),
      styles: stylesSelector(state),
    };
  },
)(withInputState(MessageListContainer));

hoistNonReactStatics(ConnectedMessageListContainer, MessageListContainer);

export default ConnectedMessageListContainer;
