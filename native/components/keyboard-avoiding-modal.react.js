// @flow

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import * as React from 'react';
import { StyleSheet, View, Platform, ViewPropTypes } from 'react-native';
import PropTypes from 'prop-types';

import { iosKeyboardOffset } from '../dimensions';
import KeyboardAvoidingView from './keyboard-avoiding-view.react';

type Props = {|
  children?: React.Node,
  style?: StyleObj,
  containerStyle?: StyleObj,
|};
class KeyboardAvoidingModal extends React.PureComponent<Props> {

  static propTypes = {
    children: PropTypes.node,
    style: ViewPropTypes.style,
    containerStyle: ViewPropTypes.style,
  };

  render() {
    const content = (
      <View style={[styles.modal, this.props.style]}>
        {this.props.children}
      </View>
    );
    if (Platform.OS === "ios") {
      return (
        <KeyboardAvoidingView
          style={[styles.container, this.props.containerStyle]}
          behavior="padding"
          keyboardVerticalOffset={iosKeyboardOffset}
        >{content}</KeyboardAvoidingView>
      );
    } else {
      return (
        <View style={[styles.container, this.props.containerStyle]}>
          {content}
        </View>
      );
    }
  }

}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 15,
    marginTop: 100,
  },
  modal: {
    padding: 12,
    borderRadius: 5,
    backgroundColor: '#EEEEEE',
  },
});

export default KeyboardAvoidingModal;
