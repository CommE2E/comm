// @flow

import * as React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';

import Button from './button.react.js';
import { useColors, useStyles } from '../themes/colors.js';
import type { ViewStyle } from '../types/styles';

type Props = {
  +onPress: () => mixed,
  +label?: string,
  +variant?: 'enabled' | 'disabled' | 'loading' | 'outline' | 'danger',
  +children?: React.Node,
  +style?: ViewStyle,
};
function PrimaryButton(props: Props): React.Node {
  const { onPress, label, variant } = props;

  const styles = useStyles(unboundStyles);
  const buttonStyle = React.useMemo(() => {
    let style;
    if (variant === 'disabled' || variant === 'loading') {
      style = [styles.button, styles.disabledButton];
    } else if (variant === 'outline') {
      style = [styles.button, styles.outlineButton];
    } else if (variant === 'danger') {
      style = [styles.button, styles.dangerButton];
    } else {
      style = [styles.button];
    }
    return [...style, props.style];
  }, [
    props.style,
    styles.button,
    styles.dangerButton,
    styles.disabledButton,
    styles.outlineButton,
    variant,
  ]);
  const buttonTextStyle = React.useMemo(() => {
    if (variant === 'disabled') {
      return [styles.buttonText, styles.disabledButtonText];
    } else if (variant === 'loading') {
      return [styles.buttonText, styles.invisibleLoadingText];
    } else if (variant === 'danger') {
      return [styles.buttonText, styles.dangerButtonText];
    } else if (variant === 'outline') {
      return [styles.buttonText, styles.outlineButtonText];
    }
    return styles.buttonText;
  }, [
    variant,
    styles.buttonText,
    styles.disabledButtonText,
    styles.invisibleLoadingText,
    styles.dangerButtonText,
    styles.outlineButtonText,
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

  const content = React.useMemo(() => {
    if (label) {
      return <Text style={buttonTextStyle}>{label}</Text>;
    }
    return props.children;
  }, [buttonTextStyle, label, props.children]);

  return (
    <Button
      onPress={onPress}
      iosActiveOpacity={0.6}
      style={buttonStyle}
      disabled={variant === 'disabled' || variant === 'loading'}
    >
      {content}
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
    color: 'whiteText',
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
  dangerButton: {
    backgroundColor: 'panelBackground',
    borderColor: 'vibrantRedButton',
    borderWidth: 1,
  },
  disabledButtonText: {
    color: 'disabledButtonText',
  },
  invisibleLoadingText: {
    color: 'transparent',
  },
  dangerButtonText: {
    color: 'redText',
  },
  outlineButtonText: {
    color: 'panelForegroundLabel',
  },
  spinner: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default PrimaryButton;
