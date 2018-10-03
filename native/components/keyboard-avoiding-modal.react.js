// @flow

import type { ViewStyle } from '../types/styles';

import * as React from 'react';
import { StyleSheet, View, ViewPropTypes } from 'react-native';
import PropTypes from 'prop-types';
import Modal from 'react-native-modal';

type Props = {|
  isVisible: bool,
  onClose: () => void,
  children?: React.Node,
  style?: ViewStyle,
  containerStyle?: ViewStyle,
|};
class KeyboardAvoidingModal extends React.PureComponent<Props> {

  static propTypes = {
    isVisible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    children: PropTypes.node,
    style: ViewPropTypes.style,
    containerStyle: ViewPropTypes.style,
  };

  render() {
    return (
      <Modal
        isVisible={this.props.isVisible}
        onBackButtonPress={this.props.onClose}
        onBackdropPress={this.props.onClose}
        avoidKeyboard={true}
        style={[styles.container, this.props.containerStyle]}
      >
        <View style={[styles.modal, this.props.style]}>
          {this.props.children}
        </View>
      </Modal>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 15,
    marginTop: 50,
    marginBottom: 30,
  },
  modal: {
    padding: 12,
    borderRadius: 5,
    backgroundColor: '#EEEEEE',
  },
});

export default KeyboardAvoidingModal;
