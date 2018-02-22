// @flow

import type { AppState } from '../redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import type { SendMessageResult } from 'lib/actions/message-actions';
import type { RawTextMessageInfo } from 'lib/types/message-types';
import {
  type ThreadInfo,
  threadInfoPropType,
  threadPermissions,
  type ThreadJoinPayload,
} from 'lib/types/thread-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';

import React from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  Text,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  sendMessageActionTypes,
  sendMessage,
} from 'lib/actions/message-actions';
import { getNewLocalID } from 'lib/utils/local-ids';
import { messageType } from 'lib/types/message-types';
import { saveDraftActionType } from 'lib/reducers/draft-reducer';
import { threadHasPermission, viewerIsMember } from 'lib/shared/thread-utils';
import {
  joinThreadActionTypes,
  joinThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import Button from '../components/button.react';

const draftKeyFromThreadID =
  (threadID: string) => `${threadID}/message_composer`;

type Props = {
  threadInfo: ThreadInfo,
  // Redux state
  username: ?string,
  viewerID: ?string,
  draft: string,
  joinThreadLoadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  sendMessage: (threadID: string, text: string) => Promise<SendMessageResult>,
  joinThread: (
    threadID: string,
    threadPassword?: string,
  ) => Promise<ThreadJoinPayload>,
};
type State = {
  text: string,
  height: number,
};
class ChatInputBar extends React.PureComponent<Props, State> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    username: PropTypes.string,
    viewerID: PropTypes.string,
    draft: PropTypes.string.isRequired,
    joinThreadLoadingStatus: loadingStatusPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendMessage: PropTypes.func.isRequired,
    joinThread: PropTypes.func.isRequired,
  };
  textInput: ?TextInput;

  constructor(props: Props) {
    super(props);
    this.state = {
      text: props.draft,
      height: 0,
    };
  }

  componentWillUpdate(nextProps: Props, nextState: State) {
    if (
      this.state.text === "" && nextState.text !== "" ||
      this.state.text !== "" && nextState.text === ""
    ) {
      LayoutAnimation.easeInEaseOut();
    }
  }

  render() {
    const isMember = viewerIsMember(this.props.threadInfo);
    let joinButton = null;
    if (
      !isMember &&
      threadHasPermission(this.props.threadInfo, threadPermissions.JOIN_THREAD)
    ) {
      let buttonContent;
      if (this.props.joinThreadLoadingStatus === "loading") {
        buttonContent = (
          <ActivityIndicator
            size="small"
            color="white"
            style={styles.joinThreadLoadingIndicator}
          />
        );
      } else {
        buttonContent = (
          <Text style={styles.joinButtonText}>Join Thread</Text>
        );
      }
      joinButton = (
        <View style={styles.joinButtonContainer}>
          <Button
            onPress={this.onPressJoin}
            iosActiveOpacity={0.5}
            style={styles.joinButton}
          >
            {buttonContent}
          </Button>
        </View>
      );
    }

    let content;
    if (threadHasPermission(this.props.threadInfo, threadPermissions.VOICED)) {
      const textInputStyle = {
        height: Math.max(this.state.height, 30),
      };
      const textInput = (
        <TextInput
          value={this.state.text}
          onChangeText={this.updateText}
          underlineColorAndroid="transparent"
          placeholder="Send a message..."
          placeholderTextColor="#888888"
          multiline={true}
          onContentSizeChange={this.onContentSizeChange}
          style={[styles.textInput, textInputStyle]}
          ref={this.textInputRef}
        />
      );
      let button = null;
      if (this.state.text) {
        button = (
          <TouchableOpacity
            onPress={this.onSend}
            activeOpacity={0.4}
            style={styles.sendButton}
          >
            <Icon
              name="chevron-right"
              size={25}
              style={styles.sendIcon}
              color="#88BB88"
            />
          </TouchableOpacity>
        );
      }
      content = (
        <View style={styles.inputContainer}>
          <View style={styles.textInputContainer}>
            {textInput}
          </View>
          {button}
        </View>
      );
    } else if (isMember) {
      content = (
        <Text style={styles.explanation}>
          You don't have permission to send messages.
        </Text>
      );
    } else {
      const defaultRoleID = Object.keys(this.props.threadInfo.roles)
        .find(roleID => this.props.threadInfo.roles[roleID].isDefault);
      invariant(
        defaultRoleID !== undefined,
        "all threads should have a default role",
      );
      const defaultRole = this.props.threadInfo.roles[defaultRoleID];
      const membersAreVoiced =
        !!defaultRole.permissions[threadPermissions.VOICED];
      if (membersAreVoiced) {
        content = (
          <Text style={styles.explanation}>
            Join this thread to send messages.
          </Text>
        );
      } else {
        content = (
          <Text style={styles.explanation}>
            You don't have permission to send messages.
          </Text>
        );
      }
    }

    return (
      <View style={styles.container}>
        {joinButton}
        {content}
      </View>
    );
  }

  textInputRef = (textInput: ?TextInput) => {
    this.textInput = textInput;
  }

  updateText = (text: string) => {
    this.setState({ text });
    this.props.dispatchActionPayload(
      saveDraftActionType,
      { key: draftKeyFromThreadID(this.props.threadInfo.id), draft: text },
    );
  }

  onContentSizeChange = (event) => {
    let height = event.nativeEvent.contentSize.height;
    // iOS doesn't include the margin on this callback
    height = Platform.OS === "ios" ? height + 10 : height;
    this.setState({ height });
  }

  onSend = () => {
    this.updateText("");
    const localID = `local${getNewLocalID()}`;
    const creatorID = this.props.viewerID;
    invariant(creatorID, "should have viewer ID in order to send a message");
    const messageInfo = ({
      type: messageType.TEXT,
      localID,
      threadID: this.props.threadInfo.id,
      text: this.state.text,
      creatorID,
      time: Date.now(),
    }: RawTextMessageInfo);
    this.props.dispatchActionPromise(
      sendMessageActionTypes,
      this.sendMessageAction(messageInfo),
      undefined,
      messageInfo,
    );
  }

  async sendMessageAction(messageInfo: RawTextMessageInfo) {
    try {
      const result = await this.props.sendMessage(
        messageInfo.threadID,
        messageInfo.text,
      );
      return {
        localID: messageInfo.localID,
        serverID: result.id,
        threadID: messageInfo.threadID,
        time: result.time,
      };
    } catch (e) {
      e.localID = messageInfo.localID;
      e.threadID = messageInfo.threadID;
      throw e;
    }
  }

  onPressJoin = () => {
    this.props.dispatchActionPromise(
      joinThreadActionTypes,
      this.props.joinThread(this.props.threadInfo.id),
    );
  }

}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEEEEEEE',
    borderTopWidth: 1,
    borderColor: '#AAAAAAAA',
  },
  textInputContainer: {
    flex: 1,
  },
  textInput: {
    backgroundColor: 'white',
    marginVertical: 5,
    marginHorizontal: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    fontSize: 16,
    borderColor: '#AAAAAAAA',
    borderWidth: 1,
  },
  sendButton: {
    alignSelf: 'flex-end',
    paddingBottom: 7,
  },
  sendIcon: {
    paddingLeft: 2,
    paddingRight: 8,
  },
  explanation: {
    color: '#777777',
    textAlign: 'center',
    paddingTop: 1,
    paddingBottom: 4,
  },
  joinButtonContainer: {
    flexDirection: 'row',
    height: 36,
  },
  joinButton: {
    marginHorizontal: 12,
    marginVertical: 3,
    paddingVertical: 3,
    flex: 1,
    backgroundColor: '#44CC99FF',
    borderRadius: 5,
  },
  joinButtonText: {
    fontSize: 20,
    color: 'white',
    textAlign: 'center',
  },
  joinThreadLoadingIndicator: {
    paddingVertical: 2,
  },
});

const joinThreadLoadingStatusSelector
  = createLoadingStatusSelector(joinThreadActionTypes);

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => {
    const draft = state.drafts[draftKeyFromThreadID(ownProps.threadInfo.id)];
    return {
      username: state.currentUserInfo && !state.currentUserInfo.anonymous
        ? state.currentUserInfo.username
        : undefined,
      viewerID: state.currentUserInfo && state.currentUserInfo.id,
      draft: draft ? draft : "",
      joinThreadLoadingStatus: joinThreadLoadingStatusSelector(state),
      cookie: state.cookie,
    };
  },
  includeDispatchActionProps,
  bindServerCalls({ sendMessage, joinThread }),
)(ChatInputBar);
