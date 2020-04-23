// @flow

import * as React from 'react';
import { TextInput, View, StyleSheet } from 'react-native';

type Props = {|
  ...React.ElementConfig<typeof TextInput>,
  textInputRef: (textInput: ?TextInput) => mixed,
|};
class ClearableTextInput extends React.PureComponent<Props> {
  textInput: ?TextInput;
  lastMessageSent: ?string;

  onChangeText = (inputText: string) => {
    const { onChangeText } = this.props;
    if (!onChangeText) {
      return;
    }

    let text;
    if (this.lastMessageSent && inputText.startsWith(this.lastMessageSent)) {
      text = inputText.substring(this.lastMessageSent.length);
    } else {
      text = inputText;
      this.lastMessageSent = null;
    }
    onChangeText(text);
  };

  async getValueAndReset(): Promise<?string> {
    this.lastMessageSent = this.props.value;
    this.props.onChangeText && this.props.onChangeText('');
    if (this.textInput) {
      this.textInput.clear();
    }
    return this.props.value;
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

  textInputRef = (textInput: ?TextInput) => {
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
