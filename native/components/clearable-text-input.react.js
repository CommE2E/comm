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
    this.props.onChangeText('');

    // We are doing something very naughty here, which is that we are
    // constructing a fake nativeEvent. We are certainly not including all the
    // fields that the type is expected to have, which is why we need to
    // any-type it. We know this is okay because the code that uses
    // ClearableTextInput only accesses event.nativeEvent.selection
    const fakeSelectionEvent: any = {
      nativeEvent: { selection: { end: 0, start: 0 } },
    };
    this.props.onSelectionChange?.(fakeSelectionEvent);

    const { value } = this.props;
    this.lastMessageSent = value;
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
