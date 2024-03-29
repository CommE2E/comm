// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';

import { FIDContext } from 'lib/components/fid-provider.react.js';

import { useStyles } from '../themes/colors.js';
import FarcasterLogo from '../vectors/farcaster-logo.react.js';

function FarcasterPrompt(): React.Node {
  const fidContext = React.useContext(FIDContext);
  invariant(fidContext, 'fidContext is missing');

  const { fid } = fidContext;

  const styles = useStyles(unboundStyles);

  const headerText = fid
    ? 'Disconnect from Farcaster'
    : 'Do you want to connect your Farcaster account';

  const bodyText = fid
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
