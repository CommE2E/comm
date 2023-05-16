// @flow

import * as React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';

import Button from '../../components/button.react.js';
import { useColors, useStyles } from '../../themes/colors.js';

type Props = {
  +onPress: () => mixed,
  +label: string,
  +variant?: 'enabled' | 'disabled' | 'loading' | 'outline',
};
function RegistrationButton(props: Props): React.Node {
  const { onPress, label, variant } = props;

  const styles = useStyles(unboundStyles);
  const buttonStyle = React.useMemo(() => {
    if (variant === 'disabled' || variant === 'loading') {
      return [styles.button, styles.disabledButton];
    } else if (variant === 'outline') {
      return [styles.button, styles.outlineButton];
    } else {
      return styles.button;
    }
  }, [variant, styles.button, styles.disabledButton, styles.outlineButton]);
  const buttonTextStyle = React.useMemo(() => {
    if (variant === 'disabled') {
      return [styles.buttonText, styles.disabledButtonText];
    } else if (variant === 'loading') {
      return [styles.buttonText, styles.invisibleLoadingText];
    }
    return styles.buttonText;
  }, [
    variant,
    styles.buttonText,
    styles.disabledButtonText,
    styles.invisibleLoadingText,
  ]);

  const colors = useColors();
  const spinner = React.useMemo(() => {
    if (variant !== 'loading') {
      return undefined;
    }
    return (
      <View style={styles.spinner}>
        <ActivityIndicator size="small" color={colors.panelForegroundLabel} />
      </View>
    );
  }, [variant, styles.spinner, colors.panelForegroundLabel]);

  return (
    <Button
      onPress={onPress}
      iosActiveOpacity={0.6}
      style={buttonStyle}
      disabled={variant === 'disabled' || variant === 'loading'}
    >
      <Text style={buttonTextStyle}>{label}</Text>
      {spinner}
    </Button>
  );
}

const unboundStyles = {
  button: {
    backgroundColor: 'purpleButton',
    borderRadius: 8,
    marginVertical: 8,
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
  outlineButton: {
    backgroundColor: 'panelBackground',
    borderColor: 'panelForegroundLabel',
    borderWidth: 1,
  },
  disabledButtonText: {
    color: 'disabledButtonText',
  },
  invisibleLoadingText: {
    color: 'transparent',
  },
  spinner: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default RegistrationButton;
