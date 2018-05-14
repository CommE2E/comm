// @flow

import type {
  ____ViewStyleProp_Internal as ViewStyle,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import * as React from 'react';
import { StyleSheet, View, ViewPropTypes } from 'react-native';
import PropTypes from 'prop-types';

import KeyboardAvoidingView from './keyboard-avoiding-view.react';

type Props = {|
  children?: React.Node,
  style?: ViewStyle,
  containerStyle?: ViewStyle,
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
    return (
      <KeyboardAvoidingView
        style={[styles.container, this.props.containerStyle]}
      >{content}</KeyboardAvoidingView>
    );
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
