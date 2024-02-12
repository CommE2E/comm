// @flow

import * as React from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import { useClientBackup } from '../backup/use-client-backup.js';
import Button from '../components/button.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { setLocalSettingsActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, useStyles } from '../themes/colors.js';

type Props = {
  +navigation: ProfileNavigationProp<'BackupMenu'>,
  +route: NavigationRoute<'BackupMenu'>,
};
// eslint-disable-next-line no-unused-vars
function BackupMenu(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const dispatch = useDispatch();
  const colors = useColors();

  const isBackupEnabled = useSelector(
    state => state.localSettings.isBackupEnabled,
  );

  const { uploadBackupProtocol, restoreBackupProtocol } = useClientBackup();

  const uploadBackup = React.useCallback(async () => {
    let message = 'success';
    try {
      await uploadBackupProtocol();
    } catch (e) {
      message = `Backup upload error: ${String(getMessageForException(e))}`;
      console.error(message);
    }
    Alert.alert('Upload protocol result', message);
  }, [uploadBackupProtocol]);

  const testRestore = React.useCallback(async () => {
    let message = 'success';
    try {
      await restoreBackupProtocol();
    } catch (e) {
      message = `Backup restore error: ${String(getMessageForException(e))}`;
      console.error(message);
    }
    Alert.alert('Restore protocol result', message);
  }, [restoreBackupProtocol]);

  const onBackupToggled = React.useCallback(
    (value: boolean) => {
      dispatch({
        type: setLocalSettingsActionType,
        payload: { isBackupEnabled: value },
      });
    },
    [dispatch],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollViewContentContainer}
      style={styles.scrollView}
    >
      <Text style={styles.header}>SETTINGS</Text>
      <View style={styles.section}>
        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>Toggle automatic backup</Text>
          <Switch value={isBackupEnabled} onValueChange={onBackupToggled} />
        </View>
      </View>

      <Text style={styles.header}>ACTIONS</Text>
      <View style={styles.section}>
        <Button
          onPress={uploadBackup}
          style={styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={colors.panelIosHighlightUnderlay}
          iosActiveOpacity={0.85}
        >
          <Text style={styles.submenuText}>Test backup upload protocol</Text>
        </Button>
      </View>
      <View style={styles.section}>
        <Button
          onPress={testRestore}
          style={styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={colors.panelIosHighlightUnderlay}
          iosActiveOpacity={0.85}
        >
          <Text style={styles.submenuText}>Test backup restore protocol</Text>
        </Button>
      </View>
    </ScrollView>
  );
}

const unboundStyles = {
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    marginVertical: 2,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  submenuButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submenuText: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
};

export default BackupMenu;
