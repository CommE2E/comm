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
    ? progress.completedConversations / progress.totalNumberOfConversations
    : undefined;

  return (
    <SafeAreaView edges={safeAreaEdges} style={styles.container}>
      <Text style={styles.header}>Fetching Farcaster conversations</Text>
      <View style={styles.listContainer}>
        <View style={styles.listItem}>
          <Text style={styles.listNumber}>1.</Text>
          <Text style={styles.listText}>
            <Text style={styles.bold}>Fetching in progress</Text>: Comm is
            fetching all of your Farcaster messages so they can be backed up.
            This can take a while, depending on how many chats you have.
          </Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.listNumber}>2.</Text>
          <Text style={styles.listText}>
            <Text style={styles.bold}>No E2E encryption</Text>: Please note that
            Farcaster messages are not end-to-end encrypted, which means the
            Farcaster team can see them. For better security, consider using
            Comm DMs.
          </Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.listNumber}>3.</Text>
          <Text style={styles.listText}>
            <Text style={styles.bold}>Manual refresh</Text>: If you ever notice
            any missing messages, you can manually refresh all Farcaster chats
            from your profile screen, or refresh an individual chat from its
            settings.
          </Text>
        </View>
      </View>
      <View style={styles.progressContainer}>
        {progress ? (
          <>
            <Progress.Circle
              progress={progressValue}
              size={100}
              color={colors.panelForegroundIcon}
              strokeCap="round"
              showsText
            />
            <View>
              <Text style={styles.progressText}>
                {progress.completedConversations} of{' '}
                {progress.totalNumberOfConversations} conversations fetched
              </Text>
            </View>
            <View>
              <Text style={styles.progressText}>
                {progress.completedMessages
                  ? `${progress.completedMessages.toLocaleString()} messages fetched`
                  : null}
              </Text>
            </View>
          </>
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
  listContainer: {
    paddingBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    paddingBottom: 12,
  },
  listNumber: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    marginRight: 4,
  },
  listText: {
    flexShrink: 1,
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
  },
  bold: {
    fontWeight: 'bold',
  },
  progressContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    marginTop: 16,
    fontFamily: 'Arial',
    fontSize: 15,
    color: 'panelForegroundSecondaryLabel',
    textAlign: 'center',
  },
};

export default FarcasterSyncLoadingScreen;
