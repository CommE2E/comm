// @flow

import type { AppState } from '../redux/redux-setup';
import type { ViewStyle } from '../types/styles';
import type { RootNavigationProp } from '../navigation/root-navigator.react';

import * as React from 'react';
import {
  View,
  TouchableWithoutFeedback,
  ViewPropTypes,
  StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'lib/utils/redux-utils';

import { styleSelector } from '../themes/colors';
import KeyboardAvoidingView from './keyboard-avoiding-view.react';

type Props = $ReadOnly<{|
  navigation: RootNavigationProp<>,
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
      goBackOnce: PropTypes.func.isRequired,
    }).isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    containerStyle: ViewPropTypes.style,
    modalStyle: ViewPropTypes.style,
  };

  close = () => {
    if (this.props.navigation.isFocused()) {
      this.props.navigation.goBackOnce();
    }
  };

  render() {
    const { containerStyle, modalStyle, children } = this.props;
    return (
      <KeyboardAvoidingView
        behavior="padding"
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
