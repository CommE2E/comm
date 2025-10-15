// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { Text, TouchableWithoutFeedback, View } from 'react-native';

import { logTypes } from 'lib/components/debug-logs-context.js';

import { DebugLogsScreenRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import FarcasterLogo from '../vectors/farcaster-logo.react.js';

type TextType =
  | 'connect'
  | 'disconnect'
  | 'disconnect_or_connect_DC'
  | 'connect_DC';

type Props = {
  +textType: TextType,
};

const prompts = {
  connect: {
    headerText: 'Do you want to connect your Farcaster account?',
    bodyTexts: [
      'Connecting your Farcaster account lets us bootstrap your social ' +
        'graph. We’ll also surface communities based on your Farcaster ' +
        'channels.',
    ],
    displayLogo: true,
  },
  disconnect: {
    headerText: 'Disconnect from Farcaster',
    bodyTexts: ['You can disconnect your Farcaster account at any time.'],
    displayLogo: true,
  },
  disconnect_or_connect_DC: {
    headerText: 'Farcaster account',
    bodyTexts: ['Your Farcaster account is connected.'],
    displayLogo: true,
  },
  connect_DC: {
    headerText: 'Do you want to connect your Farcaster Direct Casts?',
    bodyTexts: [
      'If you share your Farcaster custody mnemonic below, you’ll be able to ' +
        'send and receive Direct Cast messages using Comm.',
      'You can find it in the Farcaster app within Settings → Advanced → ' +
        'Show Farcaster recovery phrase.',
      'Your mnemonic phrase is only used locally and is not sent to our ' +
        'servers.',
    ],
    displayLogo: false,
  },
};

function FarcasterPrompt(props: Props): React.Node {
  const { textType } = props;

  const { headerText, bodyTexts, displayLogo } = prompts[textType];

  const styles = useStyles(unboundStyles);

  const { navigate } = useNavigation();
  const onLogoLongPress = React.useCallback(() => {
    navigate({
      name: DebugLogsScreenRouteName,
      params: { logsFilter: new Set([logTypes.FARCASTER]) },
    });
  }, [navigate]);

  let farcasterLogo = null;
  if (displayLogo) {
    farcasterLogo = (
      <TouchableWithoutFeedback onLongPress={onLogoLongPress}>
        <View style={styles.farcasterLogoContainer}>
          <FarcasterLogo />
        </View>
      </TouchableWithoutFeedback>
    );
  }

  const bodyText = React.useMemo(
    () =>
      bodyTexts.map((text, id) => (
        <Text style={styles.body} key={id}>
          {text}
        </Text>
      )),
    [bodyTexts, styles.body],
  );

  return React.useMemo(
    () => (
      <>
        <Text style={styles.header}>{headerText}</Text>
        {bodyText}
        {farcasterLogo}
      </>
    ),
    [bodyText, farcasterLogo, headerText, styles.header],
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
