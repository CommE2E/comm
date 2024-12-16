// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { Switch, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { accountHasPassword } from 'lib/shared/account-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { getConfig } from 'lib/utils/config.js';
import { rawDeviceListFromSignedList } from 'lib/utils/device-list-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import { useClientBackup } from '../backup/use-client-backup.js';
import { useGetBackupSecretForLoggedInUser } from '../backup/use-get-backup-secret.js';
import Button from '../components/button.react.js';
import { commCoreModule } from '../native-modules.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { RestoreSIWEBackupRouteName } from '../navigation/route-names.js';
import { setLocalSettingsActionType } from '../redux/action-types.js';
import { persistConfig } from '../redux/persist.js';
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
  const getBackupSecret = useGetBackupSecretForLoggedInUser();

  const isBackupEnabled = useSelector(
    state => state.localSettings.isBackupEnabled,
  );

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { identityClient, getAuthMetadata } = identityContext;

  const userIdentifier = useSelector(state => state.currentUserInfo?.username);
  invariant(userIdentifier, 'userIdentifier should be set');

  const {
    createFullBackup,
    retrieveLatestBackupInfo,
    createUserKeysBackup,
    getBackupUserKeys,
  } = useClientBackup();

  const uploadBackup = React.useCallback(async () => {
    let message;
    try {
      const backupID = await createFullBackup();
      message = `Success!\n` + `Backup ID: ${backupID}`;
    } catch (e) {
      message = `Backup upload error: ${String(getMessageForException(e))}`;
      console.error(message);
    }
    Alert.alert('Upload protocol result', message);
  }, [createFullBackup]);

  const uploadUserKeys = React.useCallback(async () => {
    let message;
    try {
      const backupID = await createUserKeysBackup();
      message = `Success!\n` + `Backup ID: ${backupID}`;
    } catch (e) {
      message = `User Keys upload error: ${String(getMessageForException(e))}`;
      console.error(message);
    }
    Alert.alert('Upload User Keys result', message);
  }, [createUserKeysBackup]);

  const testRestoreForPasswordUser = React.useCallback(async () => {
    let message = 'success';
    try {
      const [{ backupID }, backupSecret] = await Promise.all([
        retrieveLatestBackupInfo(userIdentifier),
        getBackupSecret(),
      ]);
      const { backupDataKey, backupLogDataKey } = await getBackupUserKeys(
        userIdentifier,
        backupSecret,
        backupID,
      );
      await commCoreModule.restoreBackupData(
        backupID,
        backupDataKey,
        backupLogDataKey,
        persistConfig.version.toString(),
      );
      console.info('Backup restored.');
    } catch (e) {
      message = `Backup restore error: ${String(getMessageForException(e))}`;
      console.error(message);
    }
    Alert.alert('Restore protocol result', message);
  }, [
    getBackupSecret,
    getBackupUserKeys,
    retrieveLatestBackupInfo,
    userIdentifier,
  ]);

  const testLatestBackupInfo = React.useCallback(async () => {
    let message;
    try {
      const { backupID, userID } =
        await retrieveLatestBackupInfo(userIdentifier);
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
  }, [currentUserInfo?.id, userIdentifier, retrieveLatestBackupInfo]);

  const testSigning = React.useCallback(async () => {
    // This test only works in the following case:
    // 1. Logged in on Primary Device using v1
    // 2. Creating User Keys Backup on Primary
    // 3. Log Out on Primary Device using v1
    // 4. Log In on any native device using v1
    // 5. Perform this test
    let message;
    try {
      const { userID, backupID } =
        await retrieveLatestBackupInfo(userIdentifier);

      if (currentUserInfo?.id !== userID) {
        throw new Error('Backup returned different userID');
      }

      // We fetch Device List history to get previous primary `deviceID`
      const deviceLists =
        await identityClient.getDeviceListHistoryForUser(userID);
      if (deviceLists.length < 3) {
        throw new Error(
          'Previous Primary Device issue: device list history too short',
        );
      }

      // According to steps listed above, device list history looks like this:
      // 1. [...], [lastPrimaryDeviceID]
      // 2. [...], [lastPrimaryDeviceID]
      // 3. [...], [lastPrimaryDeviceID], []
      // 4. [...], [lastPrimaryDeviceID], [], [currentPrimaryDeviceID]
      // 5. [...], [lastPrimaryDeviceID], [], [currentPrimaryDeviceID]
      // In order to get lastPrimaryDeviceID, we need to get the last
      // but two item
      const lastDeviceListWithPrimary = deviceLists[deviceLists.length - 3];
      const lastRawDeviceListWithPrimary = rawDeviceListFromSignedList(
        lastDeviceListWithPrimary,
      );
      const lastPrimaryDeviceID = lastRawDeviceListWithPrimary.devices[0];
      if (!lastPrimaryDeviceID) {
        throw new Error('Previous Primary Device issue: empty device list');
      }

      const { deviceID } = await getAuthMetadata();
      if (deviceID === lastPrimaryDeviceID) {
        throw new Error('Previous Primary Device issue: the same deviceIDs');
      }

      const backupSecret = await getBackupSecret();
      const { pickledAccount, pickleKey } = await getBackupUserKeys(
        userIdentifier,
        backupSecret,
        backupID,
      );

      const emptyDeviceListMessage = '[]';

      // Sign using Olm Account from backup
      const signature = await commCoreModule.signMessageUsingAccount(
        emptyDeviceListMessage,
        pickledAccount,
        pickleKey,
      );

      // Verify using previous primary `deviceID`
      const { olmAPI } = getConfig();
      const verificationResult = await olmAPI.verifyMessage(
        emptyDeviceListMessage,
        signature,
        lastPrimaryDeviceID,
      );

      message =
        `Backup ID: ${backupID},\n` +
        `userID: ${userID},\n` +
        `deviceID: ${deviceID ?? ''},\n` +
        `lastPrimaryDeviceID: ${lastPrimaryDeviceID},\n` +
        `signature: ${signature},\n` +
        `verificationResult: ${verificationResult.toString()}\n`;
    } catch (e) {
      message = `Latest backup info error: ${String(
        getMessageForException(e),
      )}`;
      console.error(message);
    }
    Alert.alert('Signing with previous primary Olm Account result', message);
  }, [
    retrieveLatestBackupInfo,
    userIdentifier,
    currentUserInfo?.id,
    identityClient,
    getAuthMetadata,
    getBackupSecret,
    getBackupUserKeys,
  ]);

  const testRestoreForSIWEUser = React.useCallback(async () => {
    let message = 'success';
    try {
      const { siweBackupData } = await retrieveLatestBackupInfo(userIdentifier);

      if (!siweBackupData) {
        throw new Error('Missing SIWE message for Wallet user backup');
      }

      const {
        siweBackupMsgNonce,
        siweBackupMsgIssuedAt,
        siweBackupMsgStatement,
      } = siweBackupData;

      navigation.navigate<'RestoreSIWEBackup'>({
        name: RestoreSIWEBackupRouteName,
        params: {
          siweNonce: siweBackupMsgNonce,
          siweStatement: siweBackupMsgStatement,
          siweIssuedAt: siweBackupMsgIssuedAt,
          userIdentifier,
          signature: '',
        },
      });
    } catch (e) {
      message = `Backup restore error: ${String(getMessageForException(e))}`;
      console.error(message);
    }
  }, [retrieveLatestBackupInfo, userIdentifier, navigation]);

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
          <Text style={styles.submenuText}>Test Full Backup upload</Text>
        </Button>
      </View>
      <View style={styles.section}>
        <Button
          onPress={uploadUserKeys}
          style={styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={colors.panelIosHighlightUnderlay}
          iosActiveOpacity={0.85}
        >
          <Text style={styles.submenuText}>Test User Keys upload</Text>
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
      <View style={styles.section}>
        <Button
          onPress={testSigning}
          style={styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={colors.panelIosHighlightUnderlay}
          iosActiveOpacity={0.85}
        >
          <Text style={styles.submenuText}>
            Test signing with previous primary Olm Account
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
