// @flow

import * as React from 'react';
import { View } from 'react-native';

import {
  threadSettingsNotificationsCopy,
  useThreadSettingsNotifications,
} from 'lib/shared/thread-settings-notifications-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import EnumSettingsOption from '../../components/enum-settings-option.react.js';
import HeaderRightTextButton from '../../navigation/header-right-text-button.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import AllNotifsIllustration from '../../vectors/all-notifs-illustration.react.js';
import BadgeNotifsIllustration from '../../vectors/badge-notifs-illustration.react.js';
import MutedNotifsIllustration from '../../vectors/muted-notifs-illustration.react.js';
import type { ChatNavigationProp } from '../chat.react.js';

export type ThreadSettingsNotificationsParams = {
  +threadInfo: ThreadInfo,
};

type Props = {
  +navigation: ChatNavigationProp<'ThreadSettingsNotifications'>,
  +route: NavigationRoute<'ThreadSettingsNotifications'>,
};

function ThreadSettingsNotifications(props: Props): React.Node {
  const {
    navigation: { setOptions, goBack },
    route: {
      params: { threadInfo },
    },
  } = props;

  const {
    notificationSettings,
    onFocusedSelected,
    onBadgeOnlySelected,
    onBackgroundSelected,
    saveButtonDisabled,
    onSave,
  } = useThreadSettingsNotifications(threadInfo, goBack);

  React.useEffect(() => {
    setOptions({
      headerRight: () => (
        <HeaderRightTextButton
          label="Save"
          onPress={onSave}
          disabled={saveButtonDisabled}
        />
      ),
    });
  }, [saveButtonDisabled, onSave, setOptions]);

  const styles = useStyles(unboundStyles);

  const allNotificationsIllustration = React.useMemo(
    () => (
      <View style={styles.notificationOptionIconContainer}>
        <AllNotifsIllustration />
      </View>
    ),
    [styles.notificationOptionIconContainer],
  );

  const badgeOnlyIllustration = React.useMemo(
    () => (
      <View style={styles.notificationOptionIconContainer}>
        <BadgeNotifsIllustration />
      </View>
    ),
    [styles.notificationOptionIconContainer],
  );

  const mutedIllustration = React.useMemo(
    () => (
      <View style={styles.notificationOptionIconContainer}>
        <MutedNotifsIllustration />
      </View>
    ),
    [styles.notificationOptionIconContainer],
  );

  return (
    <View style={styles.container}>
      <View style={styles.enumSettingsOptionContainer}>
        <EnumSettingsOption
          name={threadSettingsNotificationsCopy.FOCUSED}
          enumValue={notificationSettings === 'focused'}
          onEnumValuePress={onFocusedSelected}
          description=""
          icon={allNotificationsIllustration}
        />
      </View>
      <View style={styles.enumSettingsOptionContainer}>
        <EnumSettingsOption
          name={threadSettingsNotificationsCopy.BADGE_ONLY}
          enumValue={notificationSettings === 'badge-only'}
          onEnumValuePress={onBadgeOnlySelected}
          description=""
          icon={badgeOnlyIllustration}
        />
      </View>
      <View style={styles.enumSettingsOptionContainer}>
        <EnumSettingsOption
          name={threadSettingsNotificationsCopy.BACKGROUND}
          enumValue={notificationSettings === 'background'}
          onEnumValuePress={onBackgroundSelected}
          description=""
          icon={mutedIllustration}
        />
      </View>
    </View>
  );
}

const unboundStyles = {
  container: {
    backgroundColor: 'panelForeground',
  },
  enumSettingsOptionContainer: {
    padding: 8,
  },
  notificationOptionIconContainer: {
    justifyContent: 'center',
    marginLeft: 8,
    marginRight: 16,
  },
};

export default ThreadSettingsNotifications;
