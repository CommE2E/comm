// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import { useStyles } from '../themes/colors.js';
import CommunityLogo from '../vectors/community-logo.react.js'; // Placeholder for a community logo icon

function DirectoryPrompt(): React.Node {
  const headerText = 'Expand your network';
  const bodyText =
    'We noticed you’re not part of many communities yet. Would you like to' +
    ' see what communities Comm has to offer?';

  const styles = useStyles(unboundStyles);
  const directoryPrompt = React.useMemo(
    () => (
      <>
        <Text style={styles.header}>{headerText}</Text>
        <Text style={styles.body}>{bodyText}</Text>
        <View style={styles.communityLogoContainer}>
          <CommunityLogo />
        </View>
      </>
    ),
    [
      bodyText,
      headerText,
      styles.body,
      styles.communityLogoContainer,
      styles.header,
    ],
  );

  return directoryPrompt;
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
  communityLogoContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default DirectoryPrompt;
