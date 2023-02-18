// @flow

import invariant from 'invariant';
import * as React from 'react';
import { TextInput as BaseTextInput, View, StyleSheet } from 'react-native';

import type { ClearableTextInputProps } from './clearable-text-input.js';
import TextInput from './text-input.react.js';
import type { KeyPressEvent } from '../types/react-native.js';

type State = {
  +textInputKey: number,
};
class ClearableTextInput extends React.PureComponent<
  ClearableTextInputProps,
  State,
> {
  state: State = {
    textInputKey: 0,
  };
  pendingMessage: ?{ value: string, resolve: (value: string) => void };
  lastKeyPressed: ?string;
  lastTextInputSent: number = -1;
  currentTextInput: ?React.ElementRef<typeof BaseTextInput>;
  focused: boolean = false;

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

  get pendingMessageSent(): boolean {
    return this.lastTextInputSent >= this.state.textInputKey - 1;
  }

  onOldInputChangeText: (text: string) => void = text => {
    const { pendingMessage, lastKeyPressed } = this;
    invariant(
      pendingMessage,
      'onOldInputChangeText should have a pendingMessage',
    );

    if (
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
    this.props.onChangeText(newValue);
  }

  onOldInputKeyPress: (event: KeyPressEvent) => void = event => {
    const { key } = event.nativeEvent;
    if (this.lastKeyPressed && this.lastKeyPressed.length > key.length) {
      return;
    }
    this.lastKeyPressed = key;
    this.props.onKeyPress && this.props.onKeyPress(event);
  };

  onOldInputBlur: () => void = () => {
    this.sendMessage();
  };

  onOldInputFocus: () => void = () => {
    // It's possible for the user to press the old input after the new one
    // appears. We can prevent that with pointerEvents="none", but that causes a
    // blur event when we set it, which makes the keyboard briefly pop down
    // before popping back up again when textInputRef is called below. Instead
    // we try to catch the focus event here and refocus the currentTextInput
    if (this.currentTextInput) {
      this.currentTextInput.focus();
    }
  };

  textInputRef: (
    textInput: ?React.ElementRef<typeof BaseTextInput>,
  ) => void = textInput => {
    if (this.focused && textInput) {
      textInput.focus();
    }
    this.currentTextInput = textInput;
    this.props.textInputRef(textInput);
  };

  async getValueAndReset(): Promise<string> {
    // We are doing something very naughty here, which is that we are
    // constructing a fake nativeEvent. We are certainly not including all the
    // fields that the type is expected to have, which is why we need to
    // any-type it. We know this is okay because the code that uses
    // ClearableTextInput only accesses event.nativeEvent.selection
    const fakeSelectionEvent: any = {
      nativeEvent: { selection: { end: 0, start: 0 } },
    };
    this.props.onSelectionChange?.(fakeSelectionEvent);

    this.props.onChangeText('');

    const { value } = this.props;
    if (!this.focused) {
      return value;
    }
    return await new Promise(resolve => {
      this.pendingMessage = { value, resolve };
      this.setState(prevState => ({
        textInputKey: prevState.textInputKey + 1,
      }));
    });
  }

  onFocus: () => void = () => {
    this.focused = true;
  };

  onBlur: () => void = () => {
    this.focused = false;
    if (this.pendingMessage) {
      // This is to catch a race condition where somebody hits the send button
      // and then blurs the TextInput before the textInputKey increment can
      // rerender this component. With this.focused set to false, the new
      // TextInput won't focus, and the old TextInput won't blur, which means
      // nothing will call sendMessage unless we do it right here.
      this.sendMessage();
    }
  };

  render(): React.Node {
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
          onFocus={this.onOldInputFocus}
          key={this.state.textInputKey - 1}
        />,
      );
    }
    textInputs.push(
      <TextInput
        {...props}
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        onChangeText={this.props.onChangeText}
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
