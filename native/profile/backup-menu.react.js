// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Switch, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

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
  const getBackupSecret = useGetBackupSecretForLoggedInUser();

  const isBackupEnabled = useSelector(
    state => state.localSettings.isBackupEnabled,
  );
  const latestBackupInfo = useSelector(
    state => state.backupStore.latestBackupInfo,
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

  const testLatestBackupInfo = React.useCallback(async () => {
    let message;
    try {
      const retrievedInfo = await retrieveLatestBackupInfo(userIdentifier);
      if (!retrievedInfo) {
        throw new Error('No backup found for user');
      }
      const { backupID, userID } = retrievedInfo;
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
      const retrievedInfo = await retrieveLatestBackupInfo(userIdentifier);
      if (!retrievedInfo) {
        throw new Error('No backup found for user');
      }
      const { userID, backupID } = retrievedInfo;

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

  const testUserKeysRestore = React.useCallback(async () => {
    let message;
    try {
      const retrievedBackupInfo =
        await retrieveLatestBackupInfo(userIdentifier);
      if (!retrievedBackupInfo) {
        throw new Error('latestBackupInfo not retrieved');
      }
      const { backupID } = retrievedBackupInfo;

      const backupSecret = await getBackupSecret();
      const [
        {
          backupDataKey: backupDataKeyFromBackup,
          backupLogDataKey: backupLogDataKeyFromBackup,
        },
        {
          backupID: localBackupID,
          backupDataKey: localBackupDataKey,
          backupLogDataKey: localBackupLogDataKey,
        },
      ] = await Promise.all([
        getBackupUserKeys(userIdentifier, backupSecret, backupID),
        commCoreModule.getQRAuthBackupData(),
      ]);

      const backupIDCheck =
        latestBackupInfo?.backupID === backupID && backupID === localBackupID;
      const keysCheck =
        backupDataKeyFromBackup === localBackupDataKey &&
        backupLogDataKeyFromBackup === localBackupLogDataKey;

      if (!backupIDCheck || !keysCheck) {
        throw new Error(
          '\n' +
            `backupID: ${backupID}\n` +
            `latestBackupInfo.backupID: ${
              latestBackupInfo?.backupID ?? 'undefined'
            }\n` +
            `localBackupID: ${localBackupID}\n` +
            `backupDataKeyFromBackup: ${backupDataKeyFromBackup}\n` +
            `backupLogDataKeyFromBackup: ${backupLogDataKeyFromBackup}\n` +
            `localBackupDataKey: ${localBackupDataKey}\n` +
            `localBackupLogDataKey: ${localBackupLogDataKey}\n`,
        );
      }
      message = 'Success!';
    } catch (e) {
      message = `Error restoring User Keys backup: ${String(
        getMessageForException(e),
      )}`;
      console.error(message);
    }
    Alert.alert('Restoring User Keys result', message);
  }, [
    getBackupSecret,
    getBackupUserKeys,
    latestBackupInfo?.backupID,
    retrieveLatestBackupInfo,
    userIdentifier,
  ]);

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
      <View style={styles.section}>
        <Button
          onPress={testUserKeysRestore}
          style={styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={colors.panelIosHighlightUnderlay}
          iosActiveOpacity={0.85}
        >
          <Text style={styles.submenuText}>Test User Keys restore</Text>
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
