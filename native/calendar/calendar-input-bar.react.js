// @flow

import type { AppState } from '../redux/redux-setup';
import type { Styles } from '../types/styles';

import * as React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard';
import { styleSelector } from '../themes/colors';

type Props = {|
  onSave: () => void,
  disabled: bool,
  // Redux state
  styles: Styles,
|};
type State = {|
  keyboardActive: bool,
|};
class CalendarInputBar extends React.PureComponent<Props, State> {

  static propTypes = {
    onSave: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };
  state = {
    keyboardActive: false,
  };
  keyboardShowListener: ?Object;
  keyboardDismissListener: ?Object;

  componentDidMount() {
    this.keyboardShowListener = addKeyboardShowListener(this.keyboardShow);
    this.keyboardDismissListener = addKeyboardDismissListener(
      this.keyboardDismiss,
    );
  }

  componentWillUnmount() {
    if (this.keyboardShowListener) {
      removeKeyboardListener(this.keyboardShowListener);
      this.keyboardShowListener = null;
    }
    if (this.keyboardDismissListener) {
      removeKeyboardListener(this.keyboardDismissListener);
      this.keyboardDismissListener = null;
    }
  }

  keyboardShow = () => {
    this.setState({ keyboardActive: true });
  }

  keyboardDismiss = () => {
    this.setState({ keyboardActive: false });
  }

  render() {
    const inactiveStyle = this.state.keyboardActive && !this.props.disabled
      ? undefined
      : this.props.styles.inactiveContainer;
    return (
      <View style={[ this.props.styles.container, inactiveStyle ]}>
        <Button
          onPress={this.props.onSave}
          iosActiveOpacity={0.5}
        >
          <Text style={this.props.styles.saveButtonText}>
            Save
          </Text>
        </Button>
      </View>
    );
  }

}

const styles = {
  container: {
    backgroundColor: 'listInputBar',
    alignItems: 'flex-end',
  },
  inactiveContainer: {
    height: 0,
    opacity: 0,
  },
  saveButtonText: {
    color: 'link',
    fontWeight: 'bold',
    fontSize: 16,
    padding: 8,
    marginRight: 5,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(CalendarInputBar);
