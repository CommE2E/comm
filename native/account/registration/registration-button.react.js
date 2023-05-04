// @flow

import * as React from 'react';
import { Text } from 'react-native';

import Button from '../../components/button.react.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +onPress: () => mixed,
  +label: string,
  +variant?: 'enabled' | 'disabled' | 'loading',
};
function RegistrationButton(props: Props): React.Node {
  const { onPress, label, variant } = props;

  const styles = useStyles(unboundStyles);
  const buttonStyle = React.useMemo(() => {
    if (variant === 'disabled' || variant === 'loading') {
      return [styles.button, styles.disabledButton];
    } else {
      return styles.button;
    }
  }, [variant, styles.button, styles.disabledButton]);
  const buttonTextStyle = React.useMemo(() => {
    if (variant === 'disabled') {
      return [styles.buttonText, styles.disabledButtonText];
    }
    return styles.buttonText;
  }, [variant, styles.buttonText, styles.disabledButtonText]);

  return (
    <Button
      onPress={onPress}
      iosActiveOpacity={0.6}
      style={buttonStyle}
      disabled={variant === 'disabled' || variant === 'loading'}
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
