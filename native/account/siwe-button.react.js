/* eslint-disable react-native/no-unused-styles */
/* eslint-disable flowtype/require-valid-file-annotation */
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import * as React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function SIWEButton() {
  const connector = useWalletConnect();
  const onPress = !connector.connected
    ? connector.connect
    : connector.killSession;
  return (
    <TouchableOpacity
      onPress={() => onPress()}
      style={styles.button}
      activeOpacity={0.6}
    >
      <Text style={styles.buttonText}>SIWE</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  animationContainer: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 13,
  },
  button: {
    backgroundColor: '#FFFFFFAA',
    borderRadius: 6,
    marginBottom: 10,
    marginLeft: 40,
    marginRight: 40,
    marginTop: 10,
    paddingBottom: 6,
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 6,
  },
  buttonText: {
    color: '#000000FF',
    fontFamily: 'OpenSans-Semibold',
    fontSize: 22,
    textAlign: 'center',
  },
});
