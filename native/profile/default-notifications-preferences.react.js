// @flow

import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  useSetUserSettings,
  setUserSettingsActionTypes,
} from 'lib/actions/user-actions.js';
import { registerFetchKey } from 'lib/reducers/loading-reducer.js';
import { threadSettingsNotificationsCopy } from 'lib/shared/thread-settings-notifications-utils.js';
import {
  type UpdateUserSettingsRequest,
  type NotificationTypes,
  type DefaultNotificationPayload,
  notificationTypes,
  userSettingsTypes,
} from 'lib/types/account-types.js';
import {
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import Action from '../components/action-row.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import { unknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

const CheckIcon = () => (
  <SWMansionIcon
    name="check"
    size={20}
    color="#888888"
    style={unboundStyles.icon}
  />
);

type ProfileRowProps = {
  +content: string,
  +onPress: () => void,
  +danger?: boolean,
  +selected?: boolean,
};

function NotificationRow(props: ProfileRowProps): React.Node {
  const { content, onPress, danger, selected } = props;
  return (
    <Action.Row onPress={onPress}>
      <Action.Text danger={danger} content={content} />
      {selected ? <CheckIcon /> : null}
    </Action.Row>
  );
}

const unboundStyles = {
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    marginVertical: 2,
  },
  icon: {
    lineHeight: Platform.OS === 'ios' ? 18 : 20,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
};

type BaseProps = {
  +navigation: ProfileNavigationProp<'DefaultNotifications'>,
  +route: NavigationRoute<'DefaultNotifications'>,
};

type Props = {
  ...BaseProps,
  +styles: $ReadOnly<typeof unboundStyles>,
  +dispatchActionPromise: DispatchActionPromise,
  +changeNotificationSettings: (
    notificationSettingsRequest: UpdateUserSettingsRequest,
  ) => Promise<void>,
  +selectedDefaultNotification: NotificationTypes,
};

class DefaultNotificationsPreferences extends React.PureComponent<Props> {
  async updatedDefaultNotifications(
    data: NotificationTypes,
  ): Promise<DefaultNotificationPayload> {
    const { changeNotificationSettings } = this.props;

    try {
      await changeNotificationSettings({
        name: userSettingsTypes.DEFAULT_NOTIFICATIONS,
        data,
      });
    } catch (e) {
      Alert.alert(
        unknownErrorAlertDetails.title,
        unknownErrorAlertDetails.message,
        [{ text: 'OK', onPress: () => {} }],
        { cancelable: false },
      );
    }

    return {
      [userSettingsTypes.DEFAULT_NOTIFICATIONS]: data,
    };
  }

  selectNotificationSetting = (data: NotificationTypes) => {
    const { dispatchActionPromise } = this.props;

    void dispatchActionPromise(
      setUserSettingsActionTypes,
      this.updatedDefaultNotifications(data),
    );
  };

  selectAllNotifications = () => {
    this.selectNotificationSetting(notificationTypes.FOCUSED);
  };

  selectBackgroundNotifications = () => {
    this.selectNotificationSetting(notificationTypes.BACKGROUND);
  };

  selectNoneNotifications = () => {
    this.selectNotificationSetting(notificationTypes.BADGE_ONLY);
  };

  render(): React.Node {
    const { styles, selectedDefaultNotification } = this.props;
    return (
      <ScrollView
        contentContainerStyle={styles.scrollViewContentContainer}
        style={styles.scrollView}
      >
        <Text style={styles.header}>NOTIFICATIONS</Text>
        <View style={styles.section}>
          <NotificationRow
            content={threadSettingsNotificationsCopy.HOME}
            onPress={this.selectAllNotifications}
            selected={notificationTypes.FOCUSED === selectedDefaultNotification}
          />
          <NotificationRow
            content={threadSettingsNotificationsCopy.NOTIF_COUNT_ONLY}
            onPress={this.selectBackgroundNotifications}
            selected={
              notificationTypes.BADGE_ONLY === selectedDefaultNotification
            }
          />
          <NotificationRow
            content={threadSettingsNotificationsCopy.MUTED}
            onPress={this.selectNoneNotifications}
            selected={
              notificationTypes.BACKGROUND === selectedDefaultNotification
            }
          />
        </View>
      </ScrollView>
    );
  }
}

registerFetchKey(setUserSettingsActionTypes);
const ConnectedDefaultNotificationPreferences: React.ComponentType<BaseProps> =
  React.memo(function ConnectedDefaultNotificationPreferences(
    props: BaseProps,
  ) {
    const styles = useStyles(unboundStyles);
    const dispatchActionPromise = useDispatchActionPromise();
    const changeNotificationSettings = useSetUserSettings();
    const defaultNotification = userSettingsTypes.DEFAULT_NOTIFICATIONS;

    const selectedDefaultNotification = useSelector<NotificationTypes>(
      ({ currentUserInfo }) => {
        if (
          currentUserInfo?.settings &&
          currentUserInfo?.settings[defaultNotification]
        ) {
          return currentUserInfo?.settings[defaultNotification];
        }
        return notificationTypes.FOCUSED;
      },
    );

    return (
      <DefaultNotificationsPreferences
        {...props}
        styles={styles}
        dispatchActionPromise={dispatchActionPromise}
        changeNotificationSettings={changeNotificationSettings}
        selectedDefaultNotification={selectedDefaultNotification}
      />
    );
  });

export default ConnectedDefaultNotificationPreferences;
