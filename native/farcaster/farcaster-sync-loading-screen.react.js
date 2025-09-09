// @flow

import * as React from 'react';
import { Text, View } from 'react-native';
import * as Progress from 'react-native-progress';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFarcasterSync } from 'lib/shared/farcaster/farcaster-hooks.js';

import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';

type Props = {
  +navigation: RootNavigationProp<'FarcasterSyncScreen'>,
  +route: NavigationRoute<'FarcasterSyncScreen'>,
};

function FarcasterSyncLoadingScreen(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const handleComplete = React.useCallback(() => {
    props.navigation.goBack();
  }, [props.navigation]);

  const { progress } = useFarcasterSync(handleComplete);

  const progressValue = progress
    ? progress.completed / progress.total
    : undefined;

  const phase = React.useMemo(() => {
    if (!progress?.phase) {
      return null;
    }
    const phaseText =
      progress.phase === 'conversations'
        ? 'Loading conversations...'
        : 'Loading messages...';
    return <Text style={styles.section}>{phaseText}</Text>;
  }, [progress?.phase, styles.section]);

  return (
    <SafeAreaView edges={safeAreaEdges} style={styles.container}>
      <Text style={styles.header}>Fetching Farcaster conversations</Text>
      <Text style={styles.section}>
        We’re fetching all your Farcaster conversations and messages.
      </Text>
      <Text style={styles.section}>
        This could take a while depending on how many conversations you have.
      </Text>
      {phase}
      <View style={styles.progressContainer}>
        {progress ? (
          <Progress.Circle
            progress={progressValue}
            size={100}
            color={colors.panelForegroundIcon}
            strokeCap="round"
            showsText
          />
        ) : (
          <Progress.CircleSnail
            indeterminate
            color={colors.panelForegroundIcon}
            size={100}
            strokeCap="round"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const safeAreaEdges = ['bottom', 'top'];

const unboundStyles = {
  container: {
    flex: 1,
    backgroundColor: 'panelBackground',
    justifyContent: 'space-between',
    padding: 16,
  },
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  section: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
  progressContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default FarcasterSyncLoadingScreen;
