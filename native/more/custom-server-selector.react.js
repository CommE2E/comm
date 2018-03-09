// @flow

import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
} from 'react-native';
import PropTypes from 'prop-types';

import Button from '../components/button.react';
import KeyboardAvoidingModal from '../components/keyboard-avoiding-modal.react';

type Props = {|
  currentCustomServer: ?string,
  onCompleteInput: (customServer: string) => void,
|};
type State = {|
  customServer: string,
|};
class CustomServerSelector extends React.PureComponent<Props, State> {

  static propTypes = {
    currentCustomServer: PropTypes.string,
    onCompleteInput: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      customServer: this.props.currentCustomServer
        ? this.props.currentCustomServer
        : "",
    };
  }

  render() {
    return (
      <KeyboardAvoidingModal
        containerStyle={styles.container}
        style={styles.modal}
      >
        <TextInput
          style={styles.textInput}
          underlineColorAndroid="transparent"
          value={this.state.customServer}
          onChangeText={this.onChangeCustomServer}
          autoFocus={true}
        />
        <Button
          onPress={this.onPressGo}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Go</Text>
        </Button>
      </KeyboardAvoidingModal>
    );
  }

  onChangeCustomServer = (newCustomServer: string) => {
    this.setState({ customServer: newCustomServer });
  }

  onPressGo = () => {
    this.props.onCompleteInput(this.state.customServer);
  }

}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-end',
  },
  modal: {
    marginBottom: 20,
    flexDirection: 'row',
  },
  textInput: {
    padding: 0,
    margin: 0,
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  button: {
    backgroundColor: "#88BB88",
    marginVertical: 2,
    marginHorizontal: 2,
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 18,
    textAlign: 'center',
    color: "white",
  },
});

export default CustomServerSelector;
