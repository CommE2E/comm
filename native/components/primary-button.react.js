// @flow

import * as React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';

import Button from './button.react.js';
import { useColors, useStyles } from '../themes/colors.js';
import type { ViewStyle, TextStyle } from '../types/styles';

type Props = {
  +onPress: () => mixed,
  +label?: string,
  +variant?: 'enabled' | 'disabled' | 'loading' | 'outline',
  +children?: React.Node,
  +style?: ViewStyle,
  +textStyle?: TextStyle,
};
function PrimaryButton(props: Props): React.Node {
  const { onPress, label, variant, textStyle } = props;

  const styles = useStyles(unboundStyles);
  const buttonStyle = React.useMemo(() => {
    let style;
    if (variant === 'disabled' || variant === 'loading') {
      style = [styles.button, styles.disabledButton];
    } else if (variant === 'outline') {
      style = [styles.button, styles.outlineButton];
    } else {
      style = [styles.button];
    }
    return [...style, props.style];
  }, [
    props.style,
    styles.button,
    styles.disabledButton,
    styles.outlineButton,
    variant,
  ]);
  const buttonTextStyle = React.useMemo(() => {
    let baseStyle;
    if (variant === 'disabled') {
      baseStyle = [styles.buttonText, styles.disabledButtonText];
    } else if (variant === 'loading') {
      baseStyle = [styles.buttonText, styles.invisibleLoadingText];
    } else {
      baseStyle = [styles.buttonText];
    }
    return textStyle ? [...baseStyle, textStyle] : baseStyle;
  }, [
    variant,
    styles.buttonText,
    styles.disabledButtonText,
    styles.invisibleLoadingText,
    textStyle,
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

export default PrimaryButton;
