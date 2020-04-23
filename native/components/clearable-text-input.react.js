// @flow

import type { KeyPressEvent } from '../types/react-native';

import * as React from 'react';
import { TextInput, View, Platform, StyleSheet } from 'react-native';

import invariant from 'invariant';

type Props = {|
  ...React.ElementConfig<typeof TextInput>,
  textInputRef: (textInput: ?TextInput) => mixed,
  sendMessage: (text: string) => mixed,
|};
type State = {|
  textInputKey: number,
|};
class ClearableTextInput extends React.PureComponent<Props, State> {
  state = {
    textInputKey: 0,
  };
  pendingMessage: ?string;
  lastKeyPressed: ?string;
  lastTextInputSent = -1;

  onChangeText = (text: string) => {
    this.props.onChangeText && this.props.onChangeText(text);
  };

  sendMessage() {
    if (this.lastMessageSent) {
      return;
    }
    const { pendingMessage } = this;
    invariant(pendingMessage, 'cannot send an empty message');
    this.props.sendMessage(pendingMessage);
    const textInputSent = this.state.textInputKey - 1;
    if (textInputSent > this.lastTextInputSent) {
      this.lastTextInputSent = textInputSent;
    }
  }

  get lastMessageSent() {
    return this.lastTextInputSent >= this.state.textInputKey - 1;
  }

  onOldInputChangeText = (text: string) => {
    const { pendingMessage, lastKeyPressed } = this;
    invariant(
      pendingMessage,
      'onOldInputChangeText should have a pendingMessage',
    );

    if (
      Platform.OS === 'ios' &&
      !this.lastMessageSent &&
      lastKeyPressed &&
      lastKeyPressed.length > 1
    ) {
      // This represents an autocorrect event on blur
      this.pendingMessage = text;
    }
    this.lastKeyPressed = null;

    this.sendMessage();
    this.updateTextFromOldInput(text);
  };

  updateTextFromOldInput(text: string) {
    const { pendingMessage } = this;
    invariant(
      pendingMessage,
      'updateTextFromOldInput should have a pendingMessage',
    );
    // TODO more sophisticated
    if (text.startsWith(pendingMessage)) {
      this.onChangeText(text.substring(pendingMessage.length));
    }
  }

  onOldInputKeyPress = (event: KeyPressEvent) => {
    const { key } = event.nativeEvent;
    if (this.lastKeyPressed && this.lastKeyPressed.length > key.length) {
      return;
    }
    this.lastKeyPressed = key;
    this.props.onKeyPress && this.props.onKeyPress(event);
  };

  onOldInputBlur = () => {
    this.sendMessage();
  };

  textInputRef = (textInput: ?TextInput) => {
    if (this.state.textInputKey > 0 && textInput) {
      textInput.focus();
    }
    this.props.textInputRef(textInput);
  };

  clear() {
    this.pendingMessage = this.props.value;
    this.setState(prevState => ({ textInputKey: prevState.textInputKey + 1 }));
  }

  render() {
    const { textInputRef, sendMessage, ...props } = this.props;

    const textInputs = [];
    if (this.state.textInputKey > 0 && this.pendingMessage) {
      textInputs.push(
        <TextInput
          {...props}
          style={[props.style, styles.invisibleTextInput]}
          onChangeText={this.onOldInputChangeText}
          onKeyPress={this.onOldInputKeyPress}
          onBlur={this.onOldInputBlur}
          key={this.state.textInputKey - 1}
        />,
      );
    }
    textInputs.push(
      <TextInput
        {...props}
        onChangeText={this.onChangeText}
        key={this.state.textInputKey}
        ref={this.textInputRef}
      />,
    );

    return <View style={styles.textInputContainer}>{textInputs}</View>;
  }
}

const styles = StyleSheet.create({
  invisibleTextInput: {
    opacity: 0,
    position: 'absolute',
  },
  textInputContainer: {
    flex: 1,
  },
});

export default ClearableTextInput;
