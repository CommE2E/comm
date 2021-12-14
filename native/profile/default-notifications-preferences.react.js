// @flow

import * as React from 'react';
import { View, Text, ScrollView, Platform, Alert } from 'react-native';

import {
  setUserSettings,
  setUserSettingsActionTypes,
} from 'lib/actions/user-actions';
import { registerFetchKey } from 'lib/reducers/loading-reducer';
import {
  type UpdateUserSettingsRequest,
  type NotificationTypes,
  type DefaultNotificationPayload,
  notificationTypes,
  userSettingsTypes,
} from 'lib/types/account-types';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import Action from '../components/action-row.react';
import SWMansionIcon from '../components/swmansion-icon.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils';
import { useStyles } from '../themes/colors';
import type { ProfileNavigationProp } from './profile.react';

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
      <Action.Text {...{ danger, content }} />
      {selected ? <CheckIcon /> : null}
    </Action.Row>
  );
}

type BaseProps = {
  +navigation: ProfileNavigationProp<>,
  +route: NavigationRoute<'DefaultNotifications'>,
};

type Props = {
  ...BaseProps,
  +styles: typeof unboundStyles,
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
        'Unknown error',
        'Uhh... try again?',
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

    dispatchActionPromise(
      setUserSettingsActionTypes,
      this.updatedDefaultNotifications(data),
    );
  };

  selectAllNotifications = () => {
    this.selectNotificationSetting(notificationTypes.ALL);
  };

  selectBackgroundNotifications = () => {
    this.selectNotificationSetting(notificationTypes.BACKGROUND);
  };

  selectNoneNotifications = () => {
    this.selectNotificationSetting(notificationTypes.NONE);
  };

  render() {
    const { styles, selectedDefaultNotification } = this.props;
    return (
      <ScrollView
        contentContainerStyle={styles.scrollViewContentContainer}
        style={styles.scrollView}
      >
        <Text style={styles.header}>NOTIFICATIONS</Text>
        <View style={styles.section}>
          <NotificationRow
            content="All"
            onPress={this.selectAllNotifications}
            selected={notificationTypes.ALL === selectedDefaultNotification}
          />
          <NotificationRow
            content="Background"
            onPress={this.selectBackgroundNotifications}
            selected={
              notificationTypes.BACKGROUND === selectedDefaultNotification
            }
          />
          <NotificationRow
            content="None"
            onPress={this.selectNoneNotifications}
            selected={notificationTypes.NONE === selectedDefaultNotification}
          />
        </View>
      </ScrollView>
    );
  }
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

registerFetchKey(setUserSettingsActionTypes);
const ConnectedDefaultNotificationPreferences: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedDefaultNotificationPreferences(props: BaseProps) {
    const styles = useStyles(unboundStyles);
    const dispatchActionPromise = useDispatchActionPromise();
    const changeNotificationSettings = useServerCall(setUserSettings);
    const defaultNotification = userSettingsTypes.DEFAULT_NOTIFICATIONS;

    const selectedDefaultNotification = useSelector<NotificationTypes>(
      ({ currentUserInfo }) => {
        if (
          currentUserInfo?.settings &&
          currentUserInfo?.settings[defaultNotification]
        ) {
          return currentUserInfo?.settings[defaultNotification];
        }
        return notificationTypes.ALL;
      },
    );

    return (
      <DefaultNotificationsPreferences
        {...props}
        {...{
          styles,
          dispatchActionPromise,
          changeNotificationSettings,
          selectedDefaultNotification,
        }}
      />
    );
  },
);

export default ConnectedDefaultNotificationPreferences;
