// @flow
import Clipboard from '@react-native-clipboard/clipboard';
import * as React from 'react';
import { FlatList, View, Text } from 'react-native';

import {
  useDebugLogs,
  type DebugLog,
} from 'lib/components/debug-logs-context.js';

import type { ProfileNavigationProp } from './profile.react.js';
import PrimaryButton from '../components/primary-button.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +navigation: ProfileNavigationProp<'DebugLogsScreen'>,
  +route: NavigationRoute<'DebugLogsScreen'>,
};

// eslint-disable-next-line no-unused-vars
function DebugLogsScreen(props: Props): React.Node {
  const { logs, clearLogs } = useDebugLogs();

  const copyLogs = React.useCallback(() => {
    Clipboard.setString(JSON.stringify(logs));
  }, [logs]);

  const styles = useStyles(unboundStyles);

  const renderItem = React.useCallback(
    ({ item }: { +item: DebugLog, ... }) => {
      const date = new Date(item.timestamp);
      const timestampString = date.toISOString();
      return (
        <View style={styles.item}>
          <Text style={styles.timestamp}>{timestampString}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
        </View>
      );
    },
    [styles.item, styles.message, styles.timestamp, styles.title],
  );

  return (
    <View style={styles.view}>
      <PrimaryButton onPress={clearLogs} variant="danger" label="Clear Logs" />
      <PrimaryButton onPress={copyLogs} variant="enabled" label="Copy Logs" />
      <FlatList data={logs} renderItem={renderItem} />
    </View>
  );
}

const unboundStyles = {
  view: {
    flex: 1,
    backgroundColor: 'panelBackground',
    padding: 24,
  },
  item: {
    backgroundColor: 'panelForeground',
    borderWidth: 1,
    borderTopWidth: 1,
    borderColor: 'panelForegroundBorder',
    marginBottom: 8,
    padding: 8,
  },
  timestamp: {
    color: 'panelForegroundLabel',
  },
  title: {
    color: 'panelForegroundLabel',
    fontSize: 16,
  },
  message: {
    color: 'panelForegroundSecondaryLabel',
  },
};

export default DebugLogsScreen;
