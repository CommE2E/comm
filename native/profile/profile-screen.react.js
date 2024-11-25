// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text, Platform, ScrollView } from 'react-native';
import uuid from 'uuid';

import {
  logOutActionTypes,
  useLogOut,
  usePrimaryDeviceLogOut,
  useSecondaryDeviceLogOut,
} from 'lib/actions/user-actions.js';
import { useStringForUser } from 'lib/hooks/ens-cache.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { getOwnPrimaryDeviceID } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import {
  type OutboundDMOperationSpecification,
  dmOperationSpecificationTypes,
} from 'lib/shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from 'lib/shared/dm-ops/process-dm-ops.js';
import type { LogOutResult } from 'lib/types/account-types.js';
import type { DMCreateThreadOperation } from 'lib/types/dm-ops';
import { thickThreadTypes } from 'lib/types/thread-types-enum.js';
import { type CurrentUserInfo } from 'lib/types/user-types.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';
import {
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import { deleteNativeCredentialsFor } from '../account/native-credentials.js';
import EditUserAvatar from '../avatars/edit-user-avatar.react.js';
import Action from '../components/action-row.react.js';
import Button from '../components/button.react.js';
import EditSettingButton from '../components/edit-setting-button.react.js';
import SingleLine from '../components/single-line.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import {
  EditPasswordRouteName,
  DeleteAccountRouteName,
  BuildInfoRouteName,
  DevToolsRouteName,
  AppearancePreferencesRouteName,
  FriendListRouteName,
  BlockListRouteName,
  PrivacyPreferencesRouteName,
  DefaultNotificationsPreferencesRouteName,
  LinkedDevicesRouteName,
  BackupMenuRouteName,
  KeyserverSelectionListRouteName,
  TunnelbrokerMenuRouteName,
  FarcasterAccountSettingsRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { type Colors, useColors, useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';
import { useShowVersionUnsupportedAlert } from '../utils/hooks.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

type ProfileRowProps = {
  +content: string,
  +onPress: () => void,
  +danger?: boolean,
};

function ProfileRow(props: ProfileRowProps): React.Node {
  const { content, onPress, danger } = props;
  return (
    <Action.Row onPress={onPress}>
      <Action.Text danger={danger} content={content} />
      <Action.Icon name="ios-arrow-forward" />
    </Action.Row>
  );
}

const unboundStyles = {
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  deleteAccountButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  editPasswordButton: {
    paddingTop: Platform.OS === 'android' ? 3 : 2,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    paddingRight: 12,
  },
  loggedInLabel: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
  },
  logOutText: {
    color: 'link',
    fontSize: 16,
    paddingLeft: 6,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  paddedRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    paddingVertical: 1,
  },
  unpaddedSection: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
  },
  username: {
    color: 'panelForegroundLabel',
    flex: 1,
  },
  value: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    textAlign: 'right',
  },
};

type BaseProps = {
  +navigation: ProfileNavigationProp<'ProfileScreen'>,
  +route: NavigationRoute<'ProfileScreen'>,
};
type Props = {
  ...BaseProps,
  +currentUserInfo: ?CurrentUserInfo,
  +primaryDeviceID: ?string,
  +logOutLoading: boolean,
  +colors: Colors,
  +styles: $ReadOnly<typeof unboundStyles>,
  +dispatchActionPromise: DispatchActionPromise,
  +logOut: () => Promise<LogOutResult>,
  +logOutPrimaryDevice: () => Promise<LogOutResult>,
  +logOutSecondaryDevice: () => Promise<LogOutResult>,
  +staffCanSee: boolean,
  +stringForUser: ?string,
  +isAccountWithPassword: boolean,
  +onCreateDMThread: () => Promise<void>,
  +currentUserFID: ?string,
};

class ProfileScreen extends React.PureComponent<Props> {
  get loggedOutOrLoggingOut(): boolean {
    return (
      !this.props.currentUserInfo ||
      this.props.currentUserInfo.anonymous ||
      this.props.logOutLoading
    );
  }

  render(): React.Node {
    let developerTools,
      defaultNotifications,
      keyserverSelection,
      tunnelbrokerMenu;
    const { staffCanSee } = this.props;
    if (staffCanSee) {
      developerTools = (
        <ProfileRow content="Developer tools" onPress={this.onPressDevTools} />
      );

      defaultNotifications = (
        <ProfileRow
          content="Default Notifications"
          onPress={this.onPressDefaultNotifications}
        />
      );

      keyserverSelection = (
        <ProfileRow
          content="Keyservers"
          onPress={this.onPressKeyserverSelection}
        />
      );

      tunnelbrokerMenu = (
        <ProfileRow
          content="Tunnelbroker menu"
          onPress={this.onPressTunnelbrokerMenu}
        />
      );
    }

    let backupMenu;
    if (staffCanSee) {
      backupMenu = (
        <ProfileRow content="Backup menu" onPress={this.onPressBackupMenu} />
      );
    }

    let passwordEditionUI;
    if (accountHasPassword(this.props.currentUserInfo)) {
      passwordEditionUI = (
        <Action.Row>
          <Text style={this.props.styles.label}>Password</Text>
          <Text
            style={[this.props.styles.content, this.props.styles.value]}
            numberOfLines={1}
          >
            ••••••••••••••••
          </Text>
          <EditSettingButton
            onPress={this.onPressEditPassword}
            canChangeSettings={true}
            style={this.props.styles.editPasswordButton}
          />
        </Action.Row>
      );
    }

    let linkedDevices;
    if (__DEV__) {
      linkedDevices = (
        <ProfileRow content="Linked devices" onPress={this.onPressDevices} />
      );
    }

    let farcasterAccountSettings;
    if (usingCommServicesAccessToken || __DEV__) {
      farcasterAccountSettings = (
        <ProfileRow
          content="Farcaster account"
          onPress={this.onPressFaracsterAccount}
        />
      );
    }

    let experimentalLogoutActions;
    if (__DEV__) {
      experimentalLogoutActions = (
        <>
          <ProfileRow
            danger
            content="Log out (new flow)"
            onPress={this.onPressNewLogout}
          />
        </>
      );
    }

    let dmActions;
    if (staffCanSee) {
      dmActions = (
        <>
          <ProfileRow
            content="Create a new local DM thread"
            onPress={this.onPressCreateThread}
          />
        </>
      );
    }

    return (
      <View style={this.props.styles.container}>
        <ScrollView
          contentContainerStyle={this.props.styles.scrollViewContentContainer}
          style={this.props.styles.scrollView}
        >
          <Text style={this.props.styles.header}>USER AVATAR</Text>
          <View
            style={[this.props.styles.section, this.props.styles.avatarSection]}
          >
            <EditUserAvatar
              userID={this.props.currentUserInfo?.id}
              fid={this.props.currentUserFID}
            />
          </View>
          <Text style={this.props.styles.header}>ACCOUNT</Text>
          <View style={this.props.styles.section}>
            <Action.Row>
              <Text style={this.props.styles.loggedInLabel}>Logged in as </Text>
              <SingleLine
                style={[this.props.styles.label, this.props.styles.username]}
              >
                {this.props.stringForUser}
              </SingleLine>
              <Button
                onPress={this.onPressLogOut}
                disabled={this.loggedOutOrLoggingOut}
              >
                <Text style={this.props.styles.logOutText}>Log out</Text>
              </Button>
            </Action.Row>
            {passwordEditionUI}
          </View>
          <View style={this.props.styles.section}>
            <ProfileRow
              content="Friend list"
              onPress={this.onPressFriendList}
            />
            <ProfileRow content="Block list" onPress={this.onPressBlockList} />
          </View>
          <Text style={this.props.styles.header}>PREFERENCES</Text>
          <View style={this.props.styles.section}>
            <ProfileRow content="Appearance" onPress={this.onPressAppearance} />
            <ProfileRow content="Privacy" onPress={this.onPressPrivacy} />
            {defaultNotifications}
            {backupMenu}
            {tunnelbrokerMenu}
          </View>
          <View style={this.props.styles.section}>
            {farcasterAccountSettings}
            {linkedDevices}
            {keyserverSelection}
            <ProfileRow content="Build info" onPress={this.onPressBuildInfo} />
            {developerTools}
            {experimentalLogoutActions}
            {dmActions}
          </View>
          <View style={this.props.styles.unpaddedSection}>
            <ProfileRow
              content="Delete account..."
              danger
              onPress={this.onPressDeleteAccount}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  onPressLogOut = () => {
    if (this.loggedOutOrLoggingOut) {
      return;
    }
    if (!this.props.isAccountWithPassword) {
      Alert.alert(
        'Log out',
        'Are you sure you want to log out?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: this.logOutWithoutDeletingNativeCredentialsWrapper,
            style: 'destructive',
          },
        ],
        { cancelable: true },
      );
      return;
    }
    const alertTitle =
      Platform.OS === 'ios' ? 'Keep Login Info in Keychain' : 'Keep Login Info';
    const alertDescription =
      'We will automatically fill out log-in forms with your credentials ' +
      'in the app.';
    Alert.alert(
      alertTitle,
      alertDescription,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Keep',
          onPress: this.logOutWithoutDeletingNativeCredentialsWrapper,
        },
        {
          text: 'Remove',
          onPress: this.logOutAndDeleteNativeCredentialsWrapper,
          style: 'destructive',
        },
      ],
      { cancelable: true },
    );
  };

  onPressNewLogout = () => {
    void (async () => {
      if (this.loggedOutOrLoggingOut) {
        return;
      }
      const { primaryDeviceID } = this.props;
      const currentDeviceID = await getContentSigningKey();
      const isPrimaryDevice = currentDeviceID === primaryDeviceID;

      let alertTitle, alertMessage, onPressAction;
      if (isPrimaryDevice) {
        alertTitle = 'Log out all devices?';
        alertMessage =
          'This device is your primary device, ' +
          'so logging out will cause all of your other devices to log out too.';
        onPressAction = this.logOutPrimaryDevice;
      } else {
        alertTitle = 'Log out?';
        alertMessage = 'Are you sure you want to log out of this device?';
        onPressAction = this.logOutSecondaryDevice;
      }

      Alert.alert(
        alertTitle,
        alertMessage,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: onPressAction,
            style: 'destructive',
          },
        ],
        { cancelable: true },
      );
    })();
  };

  logOutWithoutDeletingNativeCredentialsWrapper = () => {
    if (this.loggedOutOrLoggingOut) {
      return;
    }
    this.logOut();
  };

  logOutAndDeleteNativeCredentialsWrapper = async () => {
    if (this.loggedOutOrLoggingOut) {
      return;
    }
    await this.deleteNativeCredentials();
    this.logOut();
  };

  logOut() {
    void this.props.dispatchActionPromise(
      logOutActionTypes,
      this.props.logOut(),
    );
  }

  logOutPrimaryDevice = async () => {
    if (this.loggedOutOrLoggingOut) {
      return;
    }
    void this.props.dispatchActionPromise(
      logOutActionTypes,
      this.props.logOutPrimaryDevice(),
    );
  };

  logOutSecondaryDevice = async () => {
    if (this.loggedOutOrLoggingOut) {
      return;
    }
    void this.props.dispatchActionPromise(
      logOutActionTypes,
      this.props.logOutSecondaryDevice(),
    );
  };

  async deleteNativeCredentials() {
    await deleteNativeCredentialsFor();
  }

  onPressEditPassword = () => {
    this.props.navigation.navigate({ name: EditPasswordRouteName });
  };

  onPressDeleteAccount = () => {
    this.props.navigation.navigate({ name: DeleteAccountRouteName });
  };

  onPressFaracsterAccount = () => {
    this.props.navigation.navigate({ name: FarcasterAccountSettingsRouteName });
  };

  onPressDevices = () => {
    this.props.navigation.navigate({ name: LinkedDevicesRouteName });
  };

  onPressBuildInfo = () => {
    this.props.navigation.navigate({ name: BuildInfoRouteName });
  };

  onPressDevTools = () => {
    this.props.navigation.navigate({ name: DevToolsRouteName });
  };

  onPressAppearance = () => {
    this.props.navigation.navigate({ name: AppearancePreferencesRouteName });
  };

  onPressPrivacy = () => {
    this.props.navigation.navigate({ name: PrivacyPreferencesRouteName });
  };

  onPressDefaultNotifications = () => {
    this.props.navigation.navigate({
      name: DefaultNotificationsPreferencesRouteName,
    });
  };

  onPressFriendList = () => {
    this.props.navigation.navigate({ name: FriendListRouteName });
  };

  onPressBlockList = () => {
    this.props.navigation.navigate({ name: BlockListRouteName });
  };

  onPressBackupMenu = () => {
    this.props.navigation.navigate({ name: BackupMenuRouteName });
  };

  onPressTunnelbrokerMenu = () => {
    this.props.navigation.navigate({ name: TunnelbrokerMenuRouteName });
  };

  onPressKeyserverSelection = () => {
    this.props.navigation.navigate({ name: KeyserverSelectionListRouteName });
  };

  onPressCreateThread = () => {
    void this.props.onCreateDMThread();
  };
}

const logOutLoadingStatusSelector =
  createLoadingStatusSelector(logOutActionTypes);

const ConnectedProfileScreen: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedProfileScreen(props: BaseProps) {
    const currentUserInfo = useSelector(state => state.currentUserInfo);
    const primaryDeviceID = useSelector(getOwnPrimaryDeviceID);
    const logOutLoading =
      useSelector(logOutLoadingStatusSelector) === 'loading';
    const colors = useColors();
    const styles = useStyles(unboundStyles);
    const callPrimaryDeviceLogOut = usePrimaryDeviceLogOut();
    const callSecondaryDeviceLogOut = useSecondaryDeviceLogOut();
    const dispatchActionPromise = useDispatchActionPromise();
    const staffCanSee = useStaffCanSee();
    const stringForUser = useStringForUser(currentUserInfo);
    const isAccountWithPassword = useSelector(state =>
      accountHasPassword(state.currentUserInfo),
    );
    const currentUserID = useCurrentUserFID();

    const showVersionUnsupportedAlert = useShowVersionUnsupportedAlert(false);
    const callLogOut = useLogOut({
      handleUseNewFlowResponse: showVersionUnsupportedAlert,
    });

    const userID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );
    const processAndSendDMOperation = useProcessAndSendDMOperation();

    const onCreateDMThread = React.useCallback(async () => {
      invariant(userID, 'userID should be set');
      const op: DMCreateThreadOperation = {
        type: 'create_thread',
        threadID: uuid.v4(),
        creatorID: userID,
        time: Date.now(),
        threadType: thickThreadTypes.LOCAL,
        memberIDs: [],
        roleID: uuid.v4(),
        newMessageID: uuid.v4(),
      };
      const specification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'self_devices',
        },
      };
      await processAndSendDMOperation(specification);
    }, [processAndSendDMOperation, userID]);

    return (
      <ProfileScreen
        {...props}
        currentUserInfo={currentUserInfo}
        primaryDeviceID={primaryDeviceID}
        logOutLoading={logOutLoading}
        colors={colors}
        styles={styles}
        logOut={callLogOut}
        logOutPrimaryDevice={callPrimaryDeviceLogOut}
        logOutSecondaryDevice={callSecondaryDeviceLogOut}
        dispatchActionPromise={dispatchActionPromise}
        staffCanSee={staffCanSee}
        stringForUser={stringForUser}
        isAccountWithPassword={isAccountWithPassword}
        onCreateDMThread={onCreateDMThread}
        currentUserFID={currentUserID}
      />
    );
  });

export default ConnectedProfileScreen;
