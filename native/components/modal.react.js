// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import type { AppState } from '../redux/redux-setup';
import type { ViewStyle, Styles } from '../types/styles';

import * as React from 'react';
import { View, TouchableWithoutFeedback, ViewPropTypes } from 'react-native';
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
  styles: Styles,
|}>;
class Modal extends React.PureComponent<Props> {
  static propTypes = {
    children: PropTypes.node,
    navigation: PropTypes.shape({
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    containerStyle: ViewPropTypes.style,
    modalStyle: ViewPropTypes.style,
  };

  close = () => {
    this.props.navigation.goBack();
  };

  render() {
    const { containerStyle, modalStyle, children } = this.props;
    return (
      <KeyboardAvoidingView
        style={[this.props.styles.container, containerStyle]}
      >
        <TouchableWithoutFeedback onPress={this.close}>
          <View style={this.props.styles.backdrop} />
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
  backdrop: {
    position: 'absolute',
    top: -1000,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.7,
    backgroundColor: 'black',
    overflow: 'visible',
  },
  modal: {
    flex: 1,
    justifyContent: 'center',
    padding: 12,
    borderRadius: 5,
    backgroundColor: 'modalBackground',
    marginHorizontal: 15,
    marginTop: 100,
    marginBottom: 30,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(Modal);
