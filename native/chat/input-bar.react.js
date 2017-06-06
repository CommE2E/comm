// @flow

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

type Props = {
};
type State = {
  focused: bool,
  inputText: string,
  height: number,
};
class InputBar extends React.PureComponent {

  props: Props;
  state: State = {
    focused: false,
    inputText: "",
    height: 0,
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
    if (this.state.focused && this.state.inputText) {
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
            onFocus={this.onFocus}
            onBlur={this.onBlur}
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

  onFocus = () => {
    LayoutAnimation.easeInEaseOut();
    this.setState({ focused: true });
  }

  onBlur = () => {
    LayoutAnimation.easeInEaseOut();
    this.setState({ focused: false });
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
    this.setState({ inputText: "" });
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
  undefined,
  includeDispatchActionProps({ dispatchActionPromise: true }),
  bindServerCalls({ deleteEntry }),
)(InputBar);
