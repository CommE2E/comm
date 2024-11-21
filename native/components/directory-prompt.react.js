// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import { useStyles } from '../themes/colors.js';
import CommunityLogo from '../vectors/community-logo.react.js';

function DirectoryPrompt(): React.Node {
  const headerText = 'Discover communities';
  const bodyText =
    'Want to join some communities on Comm that match your vibe?';

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
