// @flow

import * as React from 'react';
import { Text } from 'react-native';

import Button from '../../components/button.react.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +onPress: () => mixed,
  +label: string,
  +state?: 'enabled' | 'disabled' | 'loading',
};
function RegistrationButton(props: Props): React.Node {
  const { onPress, label, state } = props;

  const styles = useStyles(unboundStyles);
  const buttonStyle = React.useMemo(() => {
    if (state === 'disabled' || state === 'loading') {
      return [styles.button, styles.disabledButton];
    } else {
      return styles.button;
    }
  }, [state, styles.button, styles.disabledButton]);
  const buttonTextStyle = React.useMemo(() => {
    if (state === 'disabled') {
      return [styles.buttonText, styles.disabledButtonText];
    }
    return styles.buttonText;
  }, [state, styles.buttonText, styles.disabledButtonText]);

  return (
    <Button
      onPress={onPress}
      iosActiveOpacity={0.6}
      style={buttonStyle}
      disabled={state === 'disabled' || state === 'loading'}
    >
      <Text style={buttonTextStyle}>{label}</Text>
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
  disabledButton: {
    backgroundColor: 'disabledButton',
  },
  disabledButtonText: {
    color: 'disabledButtonText',
  },
};

export default RegistrationButton;
