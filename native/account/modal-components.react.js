// @flow

import invariant from 'invariant';
import * as React from 'react';
import { TextInput as BaseTextInput, View, StyleSheet } from 'react-native';

import CoreTextInput from '../components/text-input.react.js';

type Props = React.ElementConfig<typeof BaseTextInput>;
class TextInput extends React.PureComponent<Props> {
  innerTextInput: ?React.ElementRef<typeof BaseTextInput>;

  render(): React.Node {
    const style = [styles.textInput, this.props.style];
    return (
      <View style={styles.textInputWrapperView}>
        <CoreTextInput
          placeholderTextColor="#888888"
          {...this.props}
          style={style}
          ref={this.innerTextInputRef}
        />
      </View>
    );
  }

  innerTextInputRef: (
    innerTextInput: ?React.ElementRef<typeof BaseTextInput>,
  ) => void = innerTextInput => {
    this.innerTextInput = innerTextInput;
  };

  focus() {
    invariant(this.innerTextInput, 'ref should exist');
    this.innerTextInput.focus();
  }
}

const styles = StyleSheet.create({
  textInput: {
    borderBottomColor: 'transparent',
    color: 'black',
    fontSize: 20,
    height: 40,
    margin: 0,
    padding: 0,
  },
  textInputWrapperView: {
    borderBottomColor: '#A2A2A2',
    borderBottomWidth: 1,
  },
});

export { TextInput };
