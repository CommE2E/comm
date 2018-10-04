// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import type { AppState } from '../redux-setup';

import * as React from 'react';
import {
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'lib/utils/redux-utils';

import KeyboardAvoidingView from './keyboard-avoiding-view.react';
import { createIsForegroundSelector } from '../selectors/nav-selectors';

type Props = $ReadOnly<{|
  navigation: NavigationScreenProp<NavigationLeafRoute>,
  children: React.Node,
  // Redux state
  isForeground: bool,
|}>;
class Modal extends React.PureComponent<Props> {

  static propTypes = {
    children: PropTypes.node,
    navigation: PropTypes.shape({
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    isForeground: PropTypes.bool.isRequired,
  };

  componentDidMount() {
    if (this.props.isForeground) {
      this.onForeground();
    }
  }

  componentWillUnmount() {
    if (this.props.isForeground) {
      this.onBackground();
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    if (!this.props.isForeground && nextProps.isForeground) {
      this.onForeground();
    } else if (this.props.isForeground && !nextProps.isForeground) {
      this.onBackground();
    }
  }

  onForeground() {
    BackHandler.addEventListener('hardwareBackPress', this.hardwareBack);
  }

  onBackground() {
    BackHandler.removeEventListener('hardwareBackPress', this.hardwareBack);
  }

  hardwareBack = () => {
    this.close();
    return true;
  }

  close = () => {
    this.props.navigation.goBack();
  }

  render() {
    return (
      <KeyboardAvoidingView style={styles.container}>
        <TouchableWithoutFeedback onPress={this.close}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.modal}>
          {this.props.children}
        </View>
      </KeyboardAvoidingView>
    );
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

function createModal(routeName: string) {
  const isForegroundSelector = createIsForegroundSelector(routeName);
  return connect((state: AppState) => ({
    isForeground: isForegroundSelector(state),
  }))(Modal);
}

export {
  createModal,
};
