// @flow

import * as React from 'react';
import { TextInput, View, StyleSheet } from 'react-native';

import sleep from 'lib/utils/sleep';

import { waitForInteractions } from '../utils/timers';
import type { ClearableTextInputProps } from './clearable-text-input';

class ClearableTextInput extends React.PureComponent<ClearableTextInputProps> {
  textInput: ?React.ElementRef<typeof TextInput>;
  lastMessageSent: ?string;
  queuedResolve: ?() => mixed;

  onChangeText = (inputText: string) => {
    let text;
    if (this.lastMessageSent && inputText.startsWith(this.lastMessageSent)) {
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

  render() {
    const { textInputRef, ...props } = this.props;
    return (
      <View style={styles.textInputContainer}>
        <TextInput
          {...props}
          onChangeText={this.onChangeText}
          ref={this.textInputRef}
        />
      </View>
    );
  }

  textInputRef = (textInput: ?React.ElementRef<typeof TextInput>) => {
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
