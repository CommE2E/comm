// @flow

import React from 'react';
import {
  TextInput as BaseTextInput,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import invariant from 'invariant';

class TextInput extends React.PureComponent {
  
  props: Object;
  innerTextInput: ?BaseTextInput;

  render() {
    const style = [styles.textInput, this.props.style];
    return (
      <View style={styles.textInputWrapperView}>
        <BaseTextInput
          underlineColorAndroid="transparent"
          placeholderTextColor="#888888"
          {...this.props}
          style={style}
          ref={this.innerTextInputRef}
        />
      </View>
    );
  }

  innerTextInputRef = (innerTextInput: ?BaseTextInput) => {
    this.innerTextInput = innerTextInput;
  }

  focus() {
    invariant(this.innerTextInput, "ref should exist");
    this.innerTextInput.focus();
  }

}

const styles = StyleSheet.create({
  textInputWrapperView: {
    borderBottomWidth: 1,
    borderBottomColor: '#BBBBBB',
  },
  textInput: {
    height: 40,
    fontSize: 20,
    padding: 0,
    margin: 0,
  },
});

export {
  TextInput,
};
