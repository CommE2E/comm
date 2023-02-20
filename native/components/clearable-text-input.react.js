// @flow

import * as React from 'react';
import { TextInput as BaseTextInput, View, StyleSheet } from 'react-native';

import sleep from 'lib/utils/sleep.js';

import type { ClearableTextInputProps } from './clearable-text-input.js';
import TextInput from './text-input.react.js';
import { waitForInteractions } from '../utils/timers.js';

class ClearableTextInput extends React.PureComponent<ClearableTextInputProps> {
  textInput: ?React.ElementRef<typeof BaseTextInput>;
  lastMessageSent: ?string;
  queuedResolve: ?() => mixed;

  onChangeText: (inputText: string) => void = inputText => {
    let text;
    if (
      this.lastMessageSent &&
      this.lastMessageSent.length < inputText.length &&
      inputText.startsWith(this.lastMessageSent)
    ) {
      text = inputText.substring(this.lastMessageSent.length);
    } else {
      text = inputText;
      this.lastMessageSent = null;
    }
    this.props.onChangeText(text);
  };

  getValueAndReset(): Promise<string> {
    const { value } = this.props;
    this.lastMessageSent = value;
    this.props.onChangeText('');
    if (this.textInput) {
      this.textInput.clear();
    }
    return new Promise(resolve => {
      this.queuedResolve = async () => {
        await waitForInteractions();
        await sleep(5);
        resolve(value);
      };
    });
  }

  componentDidUpdate(prevProps: ClearableTextInputProps) {
    if (!this.props.value && prevProps.value && this.queuedResolve) {
      const resolve = this.queuedResolve;
      this.queuedResolve = null;
      resolve();
    }
  }

  render(): React.Node {
    const { textInputRef, ...props } = this.props;
    return (
      <View style={styles.textInputContainer}>
        <TextInput
          {...props}
          onChangeText={this.onChangeText}
          onSelectionChange={this.props.onSelectionChange}
          ref={this.textInputRef}
        />
      </View>
    );
  }

  textInputRef: (textInput: ?React.ElementRef<typeof BaseTextInput>) => void =
    textInput => {
      this.textInput = textInput;
      this.props.textInputRef(textInput);
    };
}

const styles = StyleSheet.create({
  textInputContainer: {
    flex: 1,
  },
});

export default ClearableTextInput;
