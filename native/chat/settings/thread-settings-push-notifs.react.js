// @flow

import * as React from 'react';
import { View, Switch, TouchableOpacity, Platform } from 'react-native';
import Linking from 'react-native/Libraries/Linking/Linking.js';

import {
  updateSubscriptionActionTypes,
  updateSubscription,
} from 'lib/actions/user-actions.js';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from 'lib/types/subscription-types.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';
import type { DispatchActionPromise } from 'lib/utils/action-utils.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import { SingleLine } from '../../components/single-line.react.js';
import SWMansionIcon from '../../components/swmansion-icon.react.js';
import { CommAndroidNotifications } from '../../push/android.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles } from '../../themes/colors.js';
import Alert from '../../utils/alert.js';

type BaseProps = {
  +threadInfo: ThreadInfo,
};
type Props = {
  ...BaseProps,
  // Redux state
  +styles: typeof unboundStyles,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +hasPushPermissions: boolean,
  +updateSubscription: (
    subscriptionUpdate: SubscriptionUpdateRequest,
  ) => Promise<SubscriptionUpdateResult>,
};
type State = {
  +currentValue: boolean,
};
class ThreadSettingsPushNotifs extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      currentValue: props.threadInfo.currentUser.subscription.pushNotifs,
    };
  }

  render() {
    const componentLabel = 'Push notifs';
    let notificationsSettingsLinkingIcon = undefined;
    if (!this.props.hasPushPermissions) {
      notificationsSettingsLinkingIcon = (
        <TouchableOpacity
          onPress={this.onNotificationsSettingsLinkingIconPress}
        >
          <View style={this.props.styles.infoIcon}>
            <SWMansionIcon name="info-circle" size={25} color="gray" />
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <View style={this.props.styles.row}>
        <SingleLine style={this.props.styles.label} adjustsFontSizeToFit={true}>
          {componentLabel}
        </SingleLine>
        {notificationsSettingsLinkingIcon}
        <View style={this.props.styles.currentValue}>
          <Switch
            value={this.state.currentValue}
            onValueChange={this.onValueChange}
            disabled={!this.props.hasPushPermissions}
          />
        </View>
      </View>
    );
  }

  onValueChange = (value: boolean) => {
    this.setState({ currentValue: value });
    this.props.dispatchActionPromise(
      updateSubscriptionActionTypes,
      this.props.updateSubscription({
        threadID: this.props.threadInfo.id,
        updatedFields: {
          pushNotifs: value,
        },
      }),
    );
  };

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
    if (platformRequestsPermission && this.state.currentValue) {
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
}

const unboundStyles = {
  currentValue: {
    alignItems: 'flex-end',
    margin: 0,
    paddingLeft: 4,
    paddingRight: 0,
    paddingVertical: 0,
  },
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
  infoIcon: {
    paddingRight: 20,
  },
};

const ConnectedThreadSettingsPushNotifs: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedThreadSettingsPushNotifs(
    props: BaseProps,
  ) {
    const styles = useStyles(unboundStyles);
    const dispatchActionPromise = useDispatchActionPromise();
    const callUpdateSubscription = useServerCall(updateSubscription);
    const hasPushPermissions = useSelector(
      state => state.deviceToken !== null && state.deviceToken !== undefined,
    );
    return (
      <ThreadSettingsPushNotifs
        {...props}
        styles={styles}
        dispatchActionPromise={dispatchActionPromise}
        updateSubscription={callUpdateSubscription}
        hasPushPermissions={hasPushPermissions}
      />
    );
  });

export default ConnectedThreadSettingsPushNotifs;
