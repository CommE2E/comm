// @flow

import type { AppState } from '../redux-setup';
import {
  type ComposableMessageInfo,
  type RobotextMessageInfo,
  type LocalMessageInfo,
  type FetchMessageInfosPayload,
  messageTypes,
} from 'lib/types/message-types';
import {
  type ChatMessageItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import type { TextToMeasure } from '../text-height-measurer.react';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import _isEqual from 'lodash/fp/isEqual';
import _differenceWith from 'lodash/fp/differenceWith';
import invariant from 'invariant';

import { connect } from 'lib/utils/redux-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { messageListData } from 'lib/selectors/chat-selectors';
import { messageKey, robotextToRawString } from 'lib/shared/message-utils';
import { onlyEmojiRegex } from 'lib/shared/emojis';

import MessageList from './message-list.react';
import MessageListHeaderTitle from './message-list-header-title.react';
import ThreadSettingsButton from './thread-settings-button.react';
import { registerChatScreen } from './chat-screen-registry';
import TextHeightMeasurer from '../text-height-measurer.react';
import ChatInputBar from './chat-input-bar.react';
import {
  multimediaMessageLoadingContentHeight,
} from './multimedia-message.react';
import { textMessageMaxWidthSelector } from './composed-message-width';

export type ChatMessageInfoItemWithHeight =
  | {|
      itemType: "message",
      messageInfo: RobotextMessageInfo,
      threadInfo: ThreadInfo,
      startsConversation: bool,
      startsCluster: bool,
      endsCluster: bool,
      robotext: string,
      contentHeight: number,
    |}
  | {|
      itemType: "message",
      messageInfo: ComposableMessageInfo,
      localMessageInfo: ?LocalMessageInfo,
      threadInfo: ThreadInfo,
      startsConversation: bool,
      startsCluster: bool,
      endsCluster: bool,
      contentHeight: number,
    |};
export type ChatMessageItemWithHeight =
  {| itemType: "loader" |} |
  ChatMessageInfoItemWithHeight;

type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {|
    threadInfo: ThreadInfo,
  |},
|}>;

type Props = {|
  navigation: NavProp,
  // Redux state
  threadInfo: ?ThreadInfo,
  messageListData: $ReadOnlyArray<ChatMessageItem>,
  textMessageMaxWidth: number,
|};
type State = {|
  textToMeasure: TextToMeasure[],
  listDataWithHeights: ?$ReadOnlyArray<ChatMessageItemWithHeight>,
|};
class MessageListContainer extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        key: PropTypes.string.isRequired,
        params: PropTypes.shape({
          threadInfo: threadInfoPropType.isRequired,
        }).isRequired,
      }).isRequired,
      navigate: PropTypes.func.isRequired,
      setParams: PropTypes.func.isRequired,
    }).isRequired,
    threadInfo: threadInfoPropType,
    messageListData: PropTypes.arrayOf(chatMessageItemPropType).isRequired,
    textMessageMaxWidth: PropTypes.number.isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    headerTitle: (
      <MessageListHeaderTitle
        threadInfo={navigation.state.params.threadInfo}
        navigate={navigation.navigate}
      />
    ),
    headerRight:
      Platform.OS === "android"
        ? (
            <ThreadSettingsButton
              threadInfo={navigation.state.params.threadInfo}
              navigate={navigation.navigate}
            />
          )
        : null,
    headerBackTitle: "Back",
  });
  updatedHeights: Map<string, number> = new Map();

  constructor(props: Props) {
    super(props);
    const textToMeasure = props.messageListData
      ? this.textToMeasureFromListData(props.messageListData)
      : [];
    const listDataWithHeights =
      props.messageListData && textToMeasure.length === 0
        ? this.mergeHeightsIntoListData()
        : null;
    this.state = { textToMeasure, listDataWithHeights };
  }

  textToMeasureFromListData(listData: $ReadOnlyArray<ChatMessageItem>) {
    const textToMeasure = [];
    for (let item of listData) {
      if (item.itemType !== "message") {
        continue;
      }
      const { messageInfo } = item;
      if (messageInfo.type === messageTypes.TEXT) {
        const style = [
          onlyEmojiRegex.test(messageInfo.text)
            ? styles.emojiOnlyText
            : styles.text,
          { width: this.props.textMessageMaxWidth },
        ];
        textToMeasure.push({
          id: messageKey(messageInfo),
          text: messageInfo.text,
          style,
        });
      } else if (item.robotext && typeof item.robotext === "string") {
        textToMeasure.push({
          id: messageKey(messageInfo),
          text: robotextToRawString(item.robotext),
          style: styles.robotext,
        });
      }
    }
    return textToMeasure;
  }

  static getThreadInfo(props: Props): ThreadInfo {
    return props.navigation.state.params.threadInfo;
  }

  componentDidMount() {
    registerChatScreen(this.props.navigation.state.key, this);
  }

  componentWillUnmount() {
    registerChatScreen(this.props.navigation.state.key, null);
  }

  get canReset() {
    return true;
  }

  componentDidUpdate(prevProps: Props) {
    const oldThreadInfo = MessageListContainer.getThreadInfo(prevProps);
    const newThreadInfo = this.props.threadInfo;
    const threadInfoChanged = !_isEqual(newThreadInfo)(oldThreadInfo);

    if (newThreadInfo && threadInfoChanged) {
      this.props.navigation.setParams({ threadInfo: newThreadInfo });
    }

    const oldListData = prevProps.messageListData;
    const newListData = this.props.messageListData;
    if (!newListData && oldListData) {
      this.setState({
        textToMeasure: [],
        listDataWithHeights: null,
      });
    }
    if (!newListData) {
      return;
    }
    if (newListData === oldListData && !threadInfoChanged) {
      return;
    }

    const newTextToMeasure = this.textToMeasureFromListData(newListData);
    this.setState({ textToMeasure: newTextToMeasure });
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
          updateHeightForMessage={this.updateHeightForMessage}
        />
      );
    } else {
      messageList = (
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator
            color="black"
            size="large"
            style={styles.loadingIndicator}
          />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <TextHeightMeasurer
          textToMeasure={this.state.textToMeasure}
          allHeightsMeasuredCallback={this.allHeightsMeasured}
        />
        {messageList}
        <ChatInputBar threadInfo={threadInfo} />
      </View>
    );
  }

  allHeightsMeasured = (
    textToMeasure: TextToMeasure[],
    newTextHeights: Map<string, number>,
  ) => {
    if (textToMeasure !== this.state.textToMeasure) {
      return;
    }
    if (!this.props.messageListData) {
      return;
    }
    const listDataWithHeights = this.mergeHeightsIntoListData(newTextHeights);
    this.setState({ listDataWithHeights });
  }

  mergeHeightsIntoListData(textHeights?: Map<string, number>) {
    const listData = this.props.messageListData;
    const threadInfo = MessageListContainer.getThreadInfo(this.props);
    const listDataWithHeights = listData.map((item: ChatMessageItem) => {
      if (item.itemType !== "message") {
        return item;
      }
      const { messageInfo } = item;
      const id = messageKey(messageInfo);
      if (messageInfo.type === messageTypes.MULTIMEDIA) {
        // Conditional due to Flow...
        const localMessageInfo = item.localMessageInfo
          ? item.localMessageInfo
          : null;
        const updatedHeight = this.updatedHeights.get(id);
        const contentHeight =
          updatedHeight !== null && updatedHeight !== undefined
            ? updatedHeight
            : multimediaMessageLoadingContentHeight;
        return {
          itemType: "message",
          messageInfo,
          localMessageInfo,
          threadInfo,
          startsConversation: item.startsConversation,
          startsCluster: item.startsCluster,
          endsCluster: item.endsCluster,
          contentHeight,
        };
      }
      invariant(textHeights, "textHeights not set");
      const textHeight = textHeights.get(id);
      invariant(
        textHeight !== null && textHeight !== undefined,
        `height for ${id} should be set`,
      );
      if (messageInfo.type === messageTypes.TEXT) {
        // Conditional due to Flow...
        const localMessageInfo = item.localMessageInfo
          ? item.localMessageInfo
          : null;
        return {
          itemType: "message",
          messageInfo,
          localMessageInfo,
          threadInfo,
          startsConversation: item.startsConversation,
          startsCluster: item.startsCluster,
          endsCluster: item.endsCluster,
          contentHeight: textHeight,
        };
      } else {
        invariant(
          typeof item.robotext === "string",
          "Flow can't handle our fancy types :(",
        );
        return {
          itemType: "message",
          messageInfo,
          threadInfo,
          startsConversation: item.startsConversation,
          startsCluster: item.startsCluster,
          endsCluster: item.endsCluster,
          robotext: item.robotext,
          contentHeight: textHeight,
        };
      }
    });
    return listDataWithHeights;
  }

  updateHeightForMessage = (id: string, contentHeight: number) => {
    this.updatedHeights.set(id, contentHeight);
    this.setState((prevState: State) => {
      const prevListData = prevState.listDataWithHeights;
      if (!prevListData) {
        return {};
      }
      let itemModified = false;
      const newListData = prevListData.map(item => {
        if (item.itemType !== "message") {
          return item;
        }
        const { messageInfo } = item;
        const itemID = messageKey(messageInfo);
        if (itemID !== id) {
          return item;
        }
        itemModified = true;
        // Conditional due to Flow...
        const localMessageInfo = item.localMessageInfo
          ? item.localMessageInfo
          : null;
        invariant(
          messageInfo.type === messageTypes.MULTIMEDIA,
          "only MULTIMEDIA messages can have height overriden",
        );
        return {
          itemType: "message",
          messageInfo,
          localMessageInfo,
          threadInfo: item.threadInfo,
          startsConversation: item.startsConversation,
          startsCluster: item.startsCluster,
          endsCluster: item.endsCluster,
          contentHeight,
        };
      });
      if (!itemModified) {
        return {};
      }
      return { listDataWithHeights: newListData };
    });
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingIndicator: {
    flex: 1,
  },
  loadingIndicatorContainer: {
    flex: 1,
  },
  text: {
    fontSize: 18,
    fontFamily: 'Arial',
  },
  emojiOnlyText: {
    fontSize: 36,
    fontFamily: 'Arial',
  },
  robotext: {
    left: 24,
    right: 24,
    fontSize: 15,
    fontFamily: 'Arial',
  },
});

export default connect(
  (state: AppState, ownProps: { navigation: NavProp }) => {
    const threadID = ownProps.navigation.state.params.threadInfo.id;
    return {
      threadInfo: threadInfoSelector(state)[threadID],
      messageListData: messageListData(threadID)(state),
      textMessageMaxWidth: textMessageMaxWidthSelector(state),
    };
  },
)(MessageListContainer);
