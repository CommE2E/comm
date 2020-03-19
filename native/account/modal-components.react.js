// @flow

import type { Dimensions } from 'lib/types/media-types';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import {
  TextInput as BaseTextInput,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import invariant from 'invariant';
import { createSelector } from 'reselect';

import { dimensionsSelector } from '../selectors/dimension-selectors';

class TextInput extends React.PureComponent<*> {
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
  };

  focus() {
    invariant(this.innerTextInput, 'ref should exist');
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
    color: 'black',
  },
});

const usernamePlaceholderSelector: (
  state: AppState,
) => string = createSelector(
  dimensionsSelector,
  (dimensions: Dimensions): string =>
    dimensions.width < 360 ? 'Username or email' : 'Username or email address',
);

export { TextInput, usernamePlaceholderSelector };
