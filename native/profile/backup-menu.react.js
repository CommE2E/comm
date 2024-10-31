// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { Switch, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { accountHasPassword } from 'lib/shared/account-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import { useClientBackup } from '../backup/use-client-backup.js';
import Button from '../components/button.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { RestoreSIWEBackupRouteName } from '../navigation/route-names.js';
import { setLocalSettingsActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';

type Props = {
  +navigation: ProfileNavigationProp<'BackupMenu'>,
  +route: NavigationRoute<'BackupMenu'>,
};
// eslint-disable-next-line no-unused-vars
function BackupMenu(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const dispatch = useDispatch();
  const colors = useColors();
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const navigation = useNavigation();

  const isBackupEnabled = useSelector(
    state => state.localSettings.isBackupEnabled,
  );

  const {
    uploadBackupProtocol,
    restorePasswordUserBackupProtocol,
    retrieveLatestSIWEBackupData,
    retrieveLatestBackupInfo,
  } = useClientBackup();

  const uploadBackup = React.useCallback(async () => {
    let message = 'Success';
    try {
      await uploadBackupProtocol();
    } catch (e) {
      message = `Backup upload error: ${String(getMessageForException(e))}`;
      console.error(message);
    }
    Alert.alert('Upload protocol result', message);
  }, [uploadBackupProtocol]);

  const testRestoreForPasswordUser = React.useCallback(async () => {
    let message = 'success';
    try {
      await restorePasswordUserBackupProtocol();
    } catch (e) {
      message = `Backup restore error: ${String(getMessageForException(e))}`;
      console.error(message);
    }
    Alert.alert('Restore protocol result', message);
  }, [restorePasswordUserBackupProtocol]);

  const testLatestBackupInfo = React.useCallback(async () => {
    let message;
    try {
      const backupInfo = await retrieveLatestBackupInfo();
      const { backupID, userID } = backupInfo;
      message =
        `Success!\n` +
        `Backup ID: ${backupID},\n` +
        `userID: ${userID},\n` +
        `userID check: ${currentUserInfo?.id === userID ? 'true' : 'false'}`;
    } catch (e) {
      message = `Latest backup info error: ${String(
        getMessageForException(e),
      )}`;
      console.error(message);
    }
    Alert.alert('Latest backup info result', message);
  }, [currentUserInfo?.id, retrieveLatestBackupInfo]);

  const testRestoreForSIWEUser = React.useCallback(async () => {
    let message = 'success';
    try {
      const siweBackupData = await retrieveLatestSIWEBackupData();

      const {
        backupID,
        siweBackupMsgNonce,
        siweBackupMsgIssuedAt,
        siweBackupMsgStatement,
      } = siweBackupData;

      navigation.navigate<'RestoreSIWEBackup'>({
        name: RestoreSIWEBackupRouteName,
        params: {
          backupID,
          siweNonce: siweBackupMsgNonce,
          siweStatement: siweBackupMsgStatement,
          siweIssuedAt: siweBackupMsgIssuedAt,
        },
      });
    } catch (e) {
      message = `Backup restore error: ${String(getMessageForException(e))}`;
      console.error(message);
    }
  }, [navigation, retrieveLatestSIWEBackupData]);

  const onBackupToggled = React.useCallback(
    (value: boolean) => {
      dispatch({
        type: setLocalSettingsActionType,
        payload: { isBackupEnabled: value },
      });
    },
    [dispatch],
  );

  const onPressRestoreButton = accountHasPassword(currentUserInfo)
    ? testRestoreForPasswordUser
    : testRestoreForSIWEUser;

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
          onPress={onPressRestoreButton}
          style={styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={colors.panelIosHighlightUnderlay}
          iosActiveOpacity={0.85}
        >
          <Text style={styles.submenuText}>Test backup restore protocol</Text>
        </Button>
      </View>
      <View style={styles.section}>
        <Button
          onPress={testLatestBackupInfo}
          style={styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={colors.panelIosHighlightUnderlay}
          iosActiveOpacity={0.85}
        >
          <Text style={styles.submenuText}>
            Test retrieving latest backup info
          </Text>
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
