// @flow

import type { AppState } from '../redux/redux-setup';
import { messageTypes } from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { TextToMeasure } from '../text-height-measurer.react';
import type { ChatMessageInfoItemWithHeight } from './message.react';
import {
  type MessageListRoute,
  type MessageListNavProp,
  messageListRoutePropType,
  messageListNavPropType,
} from './message-list-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, Platform } from 'react-native';
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
import { onlyEmojiRegex } from 'lib/shared/emojis';

import MessageList from './message-list.react';
import MessageListHeaderTitle from './message-list-header-title.react';
import ThreadSettingsButton from './thread-settings-button.react';
import { registerChatScreen } from './chat-screen-registry';
import TextHeightMeasurer from '../text-height-measurer.react';
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

export type ChatMessageItemWithHeight =
  | {| itemType: 'loader' |}
  | ChatMessageInfoItemWithHeight;

type Props = {|
  navigation: MessageListNavProp,
  route: MessageListRoute,
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
  textToMeasure: TextToMeasure[],
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
  static navigationOptions = ({ navigation }) => ({
    headerTitle: (
      <MessageListHeaderTitle
        threadInfo={navigation.state.params.threadInfo}
        navigate={navigation.navigate}
      />
    ),
    headerRight:
      Platform.OS === 'android' ? (
        <ThreadSettingsButton
          threadInfo={navigation.state.params.threadInfo}
          navigate={navigation.navigate}
        />
      ) : null,
    headerBackTitle: 'Back',
    gesturesEnabled: !navigation.state.params.gesturesDisabled,
  });

  constructor(props: Props) {
    super(props);
    const textToMeasure = props.messageListData
      ? this.textToMeasureFromListData(props.messageListData)
      : [];
    const listDataWithHeights =
      props.messageListData && textToMeasure.length === 0
        ? this.mergeHeightsIntoListData()
        : null;
    this.state = {
      textToMeasure,
      listDataWithHeights,
    };
  }

  textToMeasureFromListData(listData: $ReadOnlyArray<ChatMessageItem>) {
    const textToMeasure = [];
    for (let item of listData) {
      if (item.itemType !== 'message') {
        continue;
      }
      const { messageInfo } = item;
      if (messageInfo.type === messageTypes.TEXT) {
        const style = [
          onlyEmojiRegex.test(messageInfo.text)
            ? this.props.styles.emojiOnlyText
            : this.props.styles.text,
          { width: this.props.textMessageMaxWidth },
        ];
        textToMeasure.push({
          id: messageKey(messageInfo),
          text: messageInfo.text,
          style,
        });
      } else if (item.robotext && typeof item.robotext === 'string') {
        textToMeasure.push({
          id: messageKey(messageInfo),
          text: robotextToRawString(item.robotext),
          style: this.props.styles.robotext,
        });
      }
    }
    return textToMeasure;
  }

  static getThreadInfo(props: Props): ThreadInfo {
    return props.route.params.threadInfo;
  }

  componentDidMount() {
    registerChatScreen(this.props.route.key, this);
  }

  componentWillUnmount() {
    registerChatScreen(this.props.route.key, null);
  }

  get canReset() {
    return true;
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
        textToMeasure: [],
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
        <TextHeightMeasurer
          textToMeasure={this.state.textToMeasure}
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
  };

  mergeHeightsIntoListData(textHeights?: Map<string, number>) {
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
      invariant(textHeights, 'textHeights not set');
      const textHeight = textHeights.get(key);
      invariant(
        textHeight !== null && textHeight !== undefined,
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
          contentHeight: textHeight,
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
          contentHeight: textHeight,
        };
      }
    });
    return listDataWithHeights;
  }
}

const styles = {
  container: {
    backgroundColor: 'listSeparator',
    flex: 1,
  },
  emojiOnlyText: {
    fontFamily: 'Arial',
    fontSize: 36,
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
  (state: AppState, ownProps: { route: MessageListRoute }) => {
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
