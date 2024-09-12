// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import { useStyles } from '../themes/colors.js';
import FarcasterLogo from '../vectors/farcaster-logo.react.js';

type TextType = 'connect' | 'disconnect';

type Props = {
  +textType: TextType,
};

function FarcasterPrompt(props: Props): React.Node {
  const { textType } = props;

  let headerText;
  if (textType === 'disconnect') {
    headerText = 'Disconnect from Farcaster';
  } else {
    headerText = 'Do you want to connect your Farcaster account?';
  }

  let bodyText;
  if (textType === 'disconnect') {
    bodyText = 'You can disconnect your Farcaster account at any time.';
  } else {
    bodyText =
      'Connecting your Farcaster account lets us bootstrap your social ' +
      'graph. We’ll also surface communities based on your Farcaster ' +
      'channels.';
  }

  const styles = useStyles(unboundStyles);
  const farcasterPrompt = React.useMemo(
    () => (
      <>
        <Text style={styles.header}>{headerText}</Text>
        <Text style={styles.body}>{bodyText}</Text>
        <View style={styles.farcasterLogoContainer}>
          <FarcasterLogo />
        </View>
      </>
    ),
    [
      bodyText,
      headerText,
      styles.body,
      styles.farcasterLogoContainer,
      styles.header,
    ],
  );

  return farcasterPrompt;
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
