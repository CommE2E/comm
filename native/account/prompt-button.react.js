// @flow

import * as React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useStyles } from '../themes/colors.js';
import EthereumLogo from '../vectors/ethereum-logo.react.js';

type Props = {
  +text: string,
  +onPress: () => mixed,
  +variant: 'regular' | 'siwe',
};

function PromptButton(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const classicAuthButtonStyle = React.useMemo(
    () => [styles.button, styles.classicAuthButton],
    [styles.button, styles.classicAuthButton],
  );
  const classicAuthButtonTextStyle = React.useMemo(
    () => [styles.buttonText, styles.classicAuthButtonText],
    [styles.buttonText, styles.classicAuthButtonText],
  );
  const siweAuthButtonStyle = React.useMemo(
    () => [styles.button, styles.siweButton],
    [styles.button, styles.siweButton],
  );
  const siweAuthButtonTextStyle = React.useMemo(
    () => [styles.buttonText, styles.siweButtonText],
    [styles.buttonText, styles.siweButtonText],
  );

  const { text, onPress, variant } = props;
  if (variant === 'regular') {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={classicAuthButtonStyle}
        activeOpacity={0.6}
      >
        <Text style={classicAuthButtonTextStyle}>{text}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={siweAuthButtonStyle}
      activeOpacity={0.6}
    >
      <View style={styles.siweIcon}>
        <EthereumLogo />
      </View>
      <Text style={siweAuthButtonTextStyle}>{text}</Text>
    </TouchableOpacity>
  );
}

const unboundStyles = {
  button: {
    borderRadius: 4,
    marginBottom: 4,
    marginTop: 4,
    marginLeft: 4,
    marginRight: 4,
    paddingBottom: 14,
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 14,
    flex: 1,
  },
  buttonText: {
    fontFamily: 'OpenSans-Semibold',
    fontSize: 17,
    textAlign: 'center',
  },
  classicAuthButton: {
    backgroundColor: 'purpleButton',
  },
  classicAuthButtonText: {
    color: 'whiteText',
  },
  siweButton: {
    backgroundColor: 'siweButton',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  siweButtonText: {
    color: 'siweButtonText',
  },
  siweIcon: {
    paddingRight: 10,
  },
};

export default PromptButton;
