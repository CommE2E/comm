// @flow

import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { SendMessageResult } from 'lib/actions/message-actions';
import type { MessageInfo } from 'lib/types/message-types';

import React from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
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

type Props = {
  threadID: string,
  // Redux state
  username: ?string,
  userID: ?string,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  sendMessage: (threadID: string, text: string) => Promise<SendMessageResult>,
};
type State = {
  inputText: string,
  height: number,
};
class InputBar extends React.PureComponent {

  props: Props;
  state: State = {
    inputText: "",
    height: 0,
  };
  static propTypes = {
    threadID: PropTypes.string.isRequired,
    username: PropTypes.string,
    userID: PropTypes.string,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendMessage: PropTypes.func.isRequired,
  };
  textInput: ?TextInput;

  componentWillUpdate(nextProps: Props, nextState: State) {
    if (
      this.state.inputText === "" && nextState.inputText !== "" ||
      this.state.inputText !== "" && nextState.inputText === ""
    ) {
      LayoutAnimation.easeInEaseOut();
    }
  }

  render() {
    let button = null;
    if (this.state.inputText) {
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
    const textInputStyle = {
      height: Math.max(this.state.height, 30),
    };
    return (
      <View style={styles.container}>
        <View style={styles.textInputContainer}>
          <TextInput
            value={this.state.inputText}
            onChangeText={this.onChangeText}
            underlineColorAndroid="transparent"
            placeholder="Send a message..."
            placeholderTextColor="#888888"
            multiline={true}
            onContentSizeChange={this.onContentSizeChange}
            onChange={this.onChange}
            style={[styles.textInput, textInputStyle]}
            ref={this.textInputRef}
          />
        </View>
        {button}
      </View>
    );
  }

  textInputRef = (textInput: ?TextInput) => {
    this.textInput = textInput;
  }

  onChangeText = (text: string) => {
    this.setState({ inputText: text });
  }

  onContentSizeChange = (event) => {
    let height = event.nativeEvent.contentSize.height;
    // iOS doesn't include the margin on this callback
    height = Platform.OS === "ios" ? height + 10 : height;
    this.setState({ height });
  }

  // On Android, onContentSizeChange only gets called once when the TextInput is
  // first rendered. Which is like, what? Anyways, instead you're supposed to
  // use onChange.
  onChange = (event) => {
    if (Platform.OS === "android") {
      this.setState({ height: event.nativeEvent.contentSize.height });
    }
  }

  onSend = () => {
    const localID = `local${getNewLocalID()}`;
    const creatorID = this.props.userID;
    invariant(creatorID, "should be logged in to send a message");
    const messageInfo = ({
      localID,
      threadID: this.props.threadID,
      text: this.state.inputText,
      creator: this.props.username,
      creatorID,
      time: Date.now(),
    }: MessageInfo);
    this.props.dispatchActionPromise(
      sendMessageActionTypes,
      this.sendMessageAction(messageInfo),
      undefined,
      messageInfo,
    );
    this.setState({ inputText: "" });
  }

  async sendMessageAction(messageInfo: MessageInfo) {
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

}

const styles = StyleSheet.create({
  container: {
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
});

export default connect(
  (state: AppState) => ({
    username: state.userInfo && state.userInfo.username,
    userID: state.userInfo && state.userInfo.id,
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ sendMessage }),
)(InputBar);
