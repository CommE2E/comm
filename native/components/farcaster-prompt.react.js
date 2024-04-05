// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import { useStyles } from '../themes/colors.js';
import FarcasterLogo from '../vectors/farcaster-logo.react.js';

type Props = {
  +currentFID?: ?string,
};

function FarcasterPrompt(props: Props): React.Node {
  const { currentFID } = props;

  const styles = useStyles(unboundStyles);

  const headerText = currentFID
    ? 'Disconnect from Farcaster'
    : 'Do you want to connect your Farcaster account';

  const bodyText = currentFID
    ? 'You can disconnect your Farcaster account at any time.'
    : 'Connecting your Farcaster account lets you see your mutual follows ' +
      'on Comm. We’ll also surface communities based on your Farcaster ' +
      'channels.';

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
