// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';

import * as React from 'react';
import {
  StyleSheet,
  View,
  TouchableWithoutFeedback,
} from 'react-native';
import PropTypes from 'prop-types';

import KeyboardAvoidingView from './keyboard-avoiding-view.react';

type Props = $ReadOnly<{|
  navigation: NavigationScreenProp<NavigationLeafRoute>,
  children: React.Node,
|}>;
class Modal extends React.PureComponent<Props> {

  static propTypes = {
    children: PropTypes.node,
    navigation: PropTypes.shape({
      goBack: PropTypes.func.isRequired,
    }).isRequired,
  };

  render() {
    return (
      <KeyboardAvoidingView style={styles.container}>
        <TouchableWithoutFeedback onPress={this.onPressBackdrop}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.modal}>
          {this.props.children}
        </View>
      </KeyboardAvoidingView>
    );
  }

  onPressBackdrop = () => {
    this.props.navigation.goBack();
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },
  modal: {
    flex: 1,
    justifyContent: "center",
    padding: 12,
    borderRadius: 5,
    backgroundColor: '#EEEEEE',
    marginHorizontal: 15,
    marginTop: 100,
    marginBottom: 30,
  },
});

export default Modal;
