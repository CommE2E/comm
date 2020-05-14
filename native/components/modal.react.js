// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import type { AppState } from '../redux/redux-setup';
import type { ViewStyle } from '../types/styles';

import * as React from 'react';
import {
  View,
  TouchableWithoutFeedback,
  ViewPropTypes,
  StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'lib/utils/redux-utils';

import KeyboardAvoidingView from '../keyboard/keyboard-avoiding-view.react';
import { styleSelector } from '../themes/colors';

type Props = $ReadOnly<{|
  navigation: NavigationScreenProp<NavigationLeafRoute>,
  children: React.Node,
  containerStyle?: ViewStyle,
  modalStyle?: ViewStyle,
  // Redux state
  styles: typeof styles,
|}>;
class Modal extends React.PureComponent<Props> {
  static propTypes = {
    children: PropTypes.node,
    navigation: PropTypes.shape({
      isFocused: PropTypes.func.isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    containerStyle: ViewPropTypes.style,
    modalStyle: ViewPropTypes.style,
  };

  close = () => {
    if (this.props.navigation.isFocused()) {
      this.props.navigation.goBack();
    }
  };

  render() {
    const { containerStyle, modalStyle, children } = this.props;
    return (
      <KeyboardAvoidingView
        style={[this.props.styles.container, containerStyle]}
      >
        <TouchableWithoutFeedback onPress={this.close}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={[this.props.styles.modal, modalStyle]}>{children}</View>
      </KeyboardAvoidingView>
    );
  }
}

const styles = {
  container: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'visible',
  },
  modal: {
    backgroundColor: 'modalBackground',
    borderRadius: 5,
    flex: 1,
    justifyContent: 'center',
    marginBottom: 30,
    marginHorizontal: 15,
    marginTop: 100,
    padding: 12,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(Modal);
