// @flow

import * as React from 'react';
import { Platform, TouchableOpacity, View, Linking } from 'react-native';

import { extractKeyserverIDFromIDOptional } from 'lib/keyserver-conn/keyserver-call-utils.js';
import { deviceTokenSelector } from 'lib/selectors/keyserver-selectors.js';
import { threadSettingsNotificationsCopy } from 'lib/shared/thread-settings-notifications-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import type { ThreadSettingsNavigate } from './thread-settings.react.js';
import EditSettingButton from '../../components/edit-setting-button.react.js';
import SingleLine from '../../components/single-line.react.js';
import SWMansionIcon from '../../components/swmansion-icon.react.js';
import { ThreadSettingsNotificationsRouteName } from '../../navigation/route-names.js';
import { CommAndroidNotifications } from '../../push/android.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles } from '../../themes/colors.js';
import Alert from '../../utils/alert.js';

const unboundStyles = {
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    flex: 1,
  },
  row: {
    alignItems: 'center',
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 3,
  },
};

type BaseProps = {
  +threadInfo: ThreadInfo,
  +navigate: ThreadSettingsNavigate,
};
type Props = {
  ...BaseProps,
  // Redux state
  +styles: $ReadOnly<typeof unboundStyles>,
  +hasPushPermissions: boolean,
};
class ThreadSettingsPushNotifs extends React.PureComponent<Props> {
  render(): React.Node {
    let componentLabel = threadSettingsNotificationsCopy.HOME;
    if (!this.props.threadInfo.currentUser.subscription.home) {
      componentLabel = threadSettingsNotificationsCopy.MUTED;
    } else if (!this.props.threadInfo.currentUser.subscription.pushNotifs) {
      componentLabel = threadSettingsNotificationsCopy.NOTIF_COUNT_ONLY;
    }

    let editSettingsButton, notifSettingsLinkingButton;
    if (this.props.hasPushPermissions) {
      editSettingsButton = (
        <EditSettingButton
          onPress={this.onPressEditThreadNotificationSettings}
        />
      );
    } else {
      notifSettingsLinkingButton = (
        <TouchableOpacity
          onPress={this.onNotificationsSettingsLinkingIconPress}
        >
          <SWMansionIcon name="info-circle" size={20} color="gray" />
        </TouchableOpacity>
      );
    }

    return (
      <View style={this.props.styles.row}>
        <SingleLine style={this.props.styles.label} adjustsFontSizeToFit={true}>
          {componentLabel}
        </SingleLine>
        {editSettingsButton}
        {notifSettingsLinkingButton}
      </View>
    );
  }

  onNotificationsSettingsLinkingIconPress = async () => {
    let platformRequestsPermission;
    if (Platform.OS !== 'android') {
      platformRequestsPermission = true;
    } else {
      platformRequestsPermission =
        await CommAndroidNotifications.canRequestNotificationsPermissionFromUser();
    }

    const alertTitle = platformRequestsPermission
      ? 'Need notif permissions'
      : 'Unable to initialize notifs';
    const notificationsSettingsPath =
      Platform.OS === 'ios'
        ? 'Settings App → Notifications → Comm'
        : 'Settings → Apps → Comm → Notifications';

    let alertMessage;
    if (
      platformRequestsPermission &&
      this.props.threadInfo.currentUser.subscription.pushNotifs
    ) {
      alertMessage =
        'Notifs for this chat are enabled, but cannot be delivered ' +
        'to this device because you haven’t granted notif permissions to Comm. ' +
        'Please enable them in ' +
        notificationsSettingsPath;
    } else if (platformRequestsPermission) {
      alertMessage =
        'In order to enable push notifs for this chat, ' +
        'you need to first grant notif permissions to Comm. ' +
        'Please enable them in ' +
        notificationsSettingsPath;
    } else {
      alertMessage =
        'Please check your network connection, make sure Google Play ' +
        'services are installed and enabled, and confirm that your Google ' +
        'Play credentials are valid in the Google Play Store.';
    }
    Alert.alert(alertTitle, alertMessage, [
      {
        text: 'Go to settings',
        onPress: () => Linking.openSettings(),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  onPressEditThreadNotificationSettings = () => {
    this.props.navigate(ThreadSettingsNotificationsRouteName, {
      threadInfo: this.props.threadInfo,
    });
  };
}

const ConnectedThreadSettingsPushNotifs: React.ComponentType<BaseProps> =
  React.memo(function ConnectedThreadSettingsPushNotifs(props: BaseProps) {
    const keyserverID = extractKeyserverIDFromIDOptional(props.threadInfo.id);
    const deviceToken = useSelector(state => {
      if (!keyserverID) {
        return state.tunnelbrokerDeviceToken;
      }
      return deviceTokenSelector(keyserverID)(state);
    });
    const hasPushPermissions =
      deviceToken !== null && deviceToken !== undefined;
    const styles = useStyles(unboundStyles);
    return (
      <ThreadSettingsPushNotifs
        {...props}
        styles={styles}
        hasPushPermissions={hasPushPermissions}
      />
    );
  });

export default ConnectedThreadSettingsPushNotifs;
