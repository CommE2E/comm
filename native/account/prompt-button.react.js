// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import PrimaryButton from '../components/primary-button.react.js';
import { useStyles } from '../themes/colors.js';
import EthereumLogo from '../vectors/ethereum-logo.react.js';

type Props = {
  +text: string,
  +onPress: () => mixed,
  +variant: 'enabled' | 'disabled' | 'loading' | 'siwe',
};

function PromptButton(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const { text, onPress, variant } = props;
  if (variant === 'siwe') {
    return (
      <View style={styles.container}>
        <PrimaryButton onPress={onPress} style={styles.siweButton}>
          <View style={styles.siweIcon}>
            <EthereumLogo />
          </View>
          <Text style={styles.buttonText}>{text}</Text>
        </PrimaryButton>
      </View>
    );
  } else {
    return (
      <View style={styles.container}>
        <PrimaryButton onPress={onPress} label={text} variant={variant} />
      </View>
    );
  }
}

const unboundStyles = {
  container: { flex: 1 },
  buttonText: {
    fontSize: 18,
    textAlign: 'center',
    color: 'siweButtonText',
  },
  siweButton: {
    backgroundColor: 'siweButton',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
  },
  siweIcon: {
    paddingRight: 10,
  },
};

export default PromptButton;
