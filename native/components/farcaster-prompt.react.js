// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import { useStyles } from '../themes/colors.js';
import FarcasterLogo from '../vectors/farcaster-logo.react.js';

function FarcasterPrompt(): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <>
      <Text style={styles.header}>
        Do you want to connect your Farcaster account?
      </Text>
      <Text style={styles.body}>
        Connecting your Farcaster account lets you see your mutual follows on
        Comm. We&rsquo;ll also surface communities based on your Farcaster
        channels.
      </Text>
      <View style={styles.farcasterLogoContainer}>
        <FarcasterLogo />
      </View>
    </>
  );
}

const unboundStyles = {
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  body: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
  farcasterLogoContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default FarcasterPrompt;
