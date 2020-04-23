// @flow

import type { KeyPressEvent } from '../types/react-native';

import * as React from 'react';
import { TextInput, View, Platform, StyleSheet } from 'react-native';

import invariant from 'invariant';

type Props = {|
  ...React.ElementConfig<typeof TextInput>,
  textInputRef: (textInput: ?TextInput) => mixed,
|};
type State = {|
  textInputKey: number,
|};
class ClearableTextInput extends React.PureComponent<Props, State> {
  state = {
    textInputKey: 0,
  };
  pendingMessage: ?{| value: ?string, resolve: (value: ?string) => void |};
  lastKeyPressed: ?string;
  lastTextInputSent = -1;

  onChangeText = (text: string) => {
    this.props.onChangeText && this.props.onChangeText(text);
  };

  sendMessage() {
    if (this.pendingMessageSent) {
      return;
    }
    const { pendingMessage } = this;
    invariant(pendingMessage, 'cannot send an empty message');
    pendingMessage.resolve(pendingMessage.value);

    const textInputSent = this.state.textInputKey - 1;
    if (textInputSent > this.lastTextInputSent) {
      this.lastTextInputSent = textInputSent;
    }
  }

  get pendingMessageSent() {
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
      !this.pendingMessageSent &&
      lastKeyPressed &&
      lastKeyPressed.length > 1
    ) {
      // This represents an autocorrect event on blur
      pendingMessage.value = text;
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
    const pendingValue = pendingMessage.value;
    if (!pendingValue || !text.startsWith(pendingValue)) {
      return;
    }
    const newValue = text.substring(pendingValue.length);
    if (this.props.value === newValue) {
      return;
    }
    this.onChangeText(newValue);
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

  getValueAndReset(): Promise<?string> {
    this.onChangeText('');
    return new Promise(resolve => {
      this.pendingMessage = {
        value: this.props.value,
        resolve,
      };
      this.setState(prevState => ({
        textInputKey: prevState.textInputKey + 1,
      }));
    });
  }

  render() {
    const { textInputRef, ...props } = this.props;

    const textInputs = [];
    if (this.state.textInputKey > 0) {
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
