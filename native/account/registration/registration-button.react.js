// @flow

import * as React from 'react';
import { Text } from 'react-native';

import Button from '../../components/button.react.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +onPress: () => mixed,
  +label: string,
};
function RegistrationButton(props: Props): React.Node {
  const { onPress, label } = props;
  const styles = useStyles(unboundStyles);
  return (
    <Button onPress={onPress} iosActiveOpacity={0.6} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Button>
  );
}

const unboundStyles = {
  button: {
    backgroundColor: 'purpleButton',
    borderRadius: 8,
    margin: 16,
  },
  buttonText: {
    fontSize: 18,
    color: 'panelForegroundLabel',
    textAlign: 'center',
    padding: 12,
  },
};

export default RegistrationButton;
