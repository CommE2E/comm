// @flow

import Clipboard from '@react-native-clipboard/clipboard';
import * as React from 'react';
import { FlatList, View, Text, Switch } from 'react-native';

import {
  useDebugLogs,
  type DebugLog,
  logTypes,
  type LogType,
} from 'lib/components/debug-logs-context.js';
import { values } from 'lib/utils/objects.js';

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
  const { logs, clearLogs, logsFilter, setFilter } = useDebugLogs();

  const copyLogs = React.useCallback(() => {
    Clipboard.setString(JSON.stringify(logs, null, 2));
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

  const toggleLogsFilter = React.useCallback(
    (logType: LogType) => {
      setFilter(logType, !logsFilter.has(logType));
    },
    [logsFilter, setFilter],
  );

  const logTypesList = React.useMemo(
    () =>
      values(logTypes).map(logType => (
        <View style={styles.submenuButton} key={logType}>
          <Text style={styles.submenuText}>{logType}</Text>
          <Switch
            value={!!logsFilter.has(logType)}
            onValueChange={() => toggleLogsFilter(logType)}
          />
        </View>
      )),
    [logsFilter, styles.submenuButton, styles.submenuText, toggleLogsFilter],
  );

  return (
    <View style={styles.view}>
      {logTypesList}
      <FlatList data={logs} renderItem={renderItem} />
      <PrimaryButton
        onPress={clearLogs}
        variant="danger"
        label="Clear filtered logs"
      />
      <PrimaryButton
        onPress={copyLogs}
        variant="enabled"
        label="Copy filtered logs"
      />
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
  submenuButton: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignItems: 'center',
  },
  submenuText: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontSize: 16,
  },
};

export default DebugLogsScreen;
