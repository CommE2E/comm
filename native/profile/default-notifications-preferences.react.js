// @flow

import * as React from 'react';
import { View, Text, Platform, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  setUserSettings,
  setUserSettingsActionTypes,
} from 'lib/actions/user-actions.js';
import { registerFetchKey } from 'lib/reducers/loading-reducer.js';
import {
  type UpdateUserSettingsRequest,
  type NotificationTypes,
  type DefaultNotificationPayload,
  notificationTypes,
  userSettingsTypes,
} from 'lib/types/account-types.js';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import Action from '../components/action-row.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

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
    this.selectNotificationSetting(notificationTypes.FOCUSED);
  };

  selectBackgroundNotifications = () => {
    this.selectNotificationSetting(notificationTypes.BACKGROUND);
  };

  selectNoneNotifications = () => {
    this.selectNotificationSetting(notificationTypes.BADGE_ONLY);
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
            content="Focused"
            onPress={this.selectAllNotifications}
            selected={notificationTypes.FOCUSED === selectedDefaultNotification}
          />
          <NotificationRow
            content="Focused (badge only)"
            onPress={this.selectBackgroundNotifications}
            selected={
              notificationTypes.BADGE_ONLY === selectedDefaultNotification
            }
          />
          <NotificationRow
            content="Background"
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
const ConnectedDefaultNotificationPreferences: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedDefaultNotificationPreferences(
    props: BaseProps,
  ) {
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
