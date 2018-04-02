// @flow

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import PropTypes from 'prop-types';

import Button from '../components/button.react';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard';

type Props = {|
  onSave: () => void,
  disabled: bool,
|};
type State = {|
  keyboardActive: bool,
|};
class CalendarInputBar extends React.PureComponent<Props, State> {

  static propTypes = {
    onSave: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
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
      : styles.inactiveContainer;
    return (
      <View style={[styles.container, inactiveStyle]}>
        <Button
          onPress={this.props.onSave}
          iosActiveOpacity={0.5}
        >
          <Text style={styles.saveButtonText}>
            Save
          </Text>
        </Button>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E2E2E2',
    alignItems: 'flex-end',
  },
  inactiveContainer: {
    height: 0,
  },
  saveButtonText: {
    color: "#036AFF",
    fontWeight: 'bold',
    fontSize: 16,
    padding: 8,
    marginRight: 5,
  },
});

export default CalendarInputBar;
