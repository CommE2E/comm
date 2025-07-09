// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import { useStyles } from '../themes/colors.js';
import FarcasterLogo from '../vectors/farcaster-logo.react.js';

type TextType = 'connect' | 'disconnect' | 'connect_DC';

type Props = {
  +textType: TextType,
};

const prompts = {
  connect: {
    headerText: 'Do you want to connect your Farcaster account?',
    bodyText:
      'Connecting your Farcaster account lets us bootstrap your social ' +
      'graph. We’ll also surface communities based on your Farcaster ' +
      'channels.',
    displayLogo: true,
  },
  disconnect: {
    headerText: 'Disconnect from Farcaster',
    bodyText: 'You can disconnect your Farcaster account at any time.',
    displayLogo: true,
  },
  connect_DC: {
    headerText: 'Do you want to connect your Farcaster Direct Casts?',
    bodyText:
      'Connecting your Farcaster Direct Casts gives Comm read and ' +
      'write access to your Direct Cast messages. This allows you to send ' +
      'and receive Direct Cast messages using Comm.',
    displayLogo: false,
  },
};

function FarcasterPrompt(props: Props): React.Node {
  const { textType } = props;

  const { headerText, bodyText, displayLogo } = prompts[textType];

  const styles = useStyles(unboundStyles);

  let farcasterLogo = null;
  if (displayLogo) {
    farcasterLogo = (
      <View style={styles.farcasterLogoContainer}>
        <FarcasterLogo />
      </View>
    );
  }

  return React.useMemo(
    () => (
      <>
        <Text style={styles.header}>{headerText}</Text>
        <Text style={styles.body}>{bodyText}</Text>
        {farcasterLogo}
      </>
    ),
    [bodyText, farcasterLogo, headerText, styles.body, styles.header],
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
