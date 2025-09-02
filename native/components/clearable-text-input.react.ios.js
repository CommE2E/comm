// @flow

import * as React from 'react';
import { TextInput as BaseTextInput, View, StyleSheet } from 'react-native';

import type { ClearableTextInputProps } from './clearable-text-input.js';
import TextInput from './text-input.react.js';

class ClearableTextInput extends React.PureComponent<ClearableTextInputProps> {
  textInputRef: (textInput: ?React.ElementRef<typeof BaseTextInput>) => void =
    textInput => {
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

    const { value } = this.props;

    this.props.onChangeText('');

    return value;
  }

  render(): React.Node {
    const { textInputRef, ...props } = this.props;

    return (
      <View style={styles.textInputContainer}>
        <TextInput
          {...props}
          onChangeText={this.props.onChangeText}
          ref={this.textInputRef}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  textInputContainer: {
    flex: 1,
  },
});

export default ClearableTextInput;
