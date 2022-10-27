// @flow

import * as React from 'react';
import { TextInput as BaseTextInput, View, StyleSheet } from 'react-native';

import Button from '../components/button.react';
import SWMansionIcon from '../components/swmansion-icon.react';
import { TextInput } from './modal-components.react';

type Props = React.ElementConfig<typeof BaseTextInput>;

type State = {
  +secureTextEntry: boolean,
};

class PasswordInput extends React.PureComponent<Props, State> {
  wrappedTextInput: ?TextInput;

  constructor(props: Props) {
    super(props);
    this.state = { secureTextEntry: true };
  }

  onToggleShowPassword: () => void = () => {
    this.setState(state => ({
      secureTextEntry: !state.secureTextEntry,
    }));
  };

  render(): React.Node {
    const { style, ...rest } = this.props;
    return (
      <View>
        <TextInput
          style={[style, styles.inputPassword]}
          {...rest}
          secureTextEntry={this.state.secureTextEntry}
          ref={this.wrappedTextInputRef}
        />
        <Button onPress={this.onToggleShowPassword} topStyle={styles.button}>
          <SWMansionIcon
            name={this.state.secureTextEntry ? 'eye-open' : 'eye-closed'}
            size={22}
            color="#555"
          />
        </Button>
      </View>
    );
  }

  wrappedTextInputRef: (wrappedTextInput: ?TextInput) => void = (
    wrappedTextInput: ?TextInput,
  ) => {
    this.wrappedTextInput = wrappedTextInput;
  };

  focus() {
    this.wrappedTextInput?.focus();
  }
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 21,
    bottom: 0,
    margin: 2,
    padding: 8,
    position: 'absolute',
    right: -10,
  },
  inputPassword: {
    paddingRight: 30,
  },
});

export default PasswordInput;
