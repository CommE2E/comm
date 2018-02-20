// @flow

import React from 'react';
import { View, StyleSheet, Text, Keyboard, Platform } from 'react-native';

import Button from '../components/button.react';

type Props = {|
  onSave: () => void,
|};
type State = {|
  keyboardActive: bool,
|};
class CalendarInputBar extends React.PureComponent<Props, State> {

  state = {
    keyboardActive: false,
  };
  keyboardShowListener: ?Object;
  keyboardDismissListener: ?Object;

  componentDidMount() {
    this.keyboardShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      this.keyboardShow,
    );
    this.keyboardDismissListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      this.keyboardDismiss,
    );
  }

  componentWillUnmount() {
    if (this.keyboardShowListener) {
      this.keyboardShowListener.remove();
      this.keyboardShowListener = null;
    }
    if (this.keyboardDismissListener) {
      this.keyboardDismissListener.remove();
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
    const inactiveStyle = this.state.keyboardActive
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
