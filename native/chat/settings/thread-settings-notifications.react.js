// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import {
  threadSettingsNotificationsCopy,
  useThreadSettingsNotifications,
} from 'lib/shared/thread-settings-notifications-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import EnumSettingsOption from '../../components/enum-settings-option.react.js';
import SWMansionIcon from '../../components/swmansion-icon.react.js';
import HeaderRightTextButton from '../../navigation/header-right-text-button.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles, useColors } from '../../themes/colors.js';
import AllNotifsIllustration from '../../vectors/all-notifs-illustration.react.js';
import BadgeNotifsIllustration from '../../vectors/badge-notifs-illustration.react.js';
import MutedNotifsIllustration from '../../vectors/muted-notifs-illustration.react.js';
import type { ChatNavigationProp } from '../chat.react.js';

export type ThreadSettingsNotificationsParams = {
  +threadInfo: ThreadInfo,
};

type NotificationDescriptionProps = {
  +selected: boolean,
  +bannerNotifsEnabled: boolean,
  +notifCountEnabled: boolean,
  +livesInHomeTab: boolean,
};

function NotificationDescription(
  props: NotificationDescriptionProps,
): React.Node {
  const { selected, bannerNotifsEnabled, notifCountEnabled, livesInHomeTab } =
    props;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const bannerNotifsDescriptionTextStyles = React.useMemo(() => {
    const style = [styles.notificationOptionDescriptionText];

    if (selected && !bannerNotifsEnabled) {
      style.push(styles.notificationOptionDescriptionTextDisabledSelected);
    } else if (!bannerNotifsEnabled) {
      style.push(styles.notificationOptionDescriptionTextDisabled);
    }

    return style;
  }, [
    bannerNotifsEnabled,
    selected,
    styles.notificationOptionDescriptionText,
    styles.notificationOptionDescriptionTextDisabled,
    styles.notificationOptionDescriptionTextDisabledSelected,
  ]);

  const notifCountDescriptionTextStyles = React.useMemo(() => {
    const style = [styles.notificationOptionDescriptionText];

    if (selected && !notifCountEnabled) {
      style.push(styles.notificationOptionDescriptionTextDisabledSelected);
    } else if (!notifCountEnabled) {
      style.push(styles.notificationOptionDescriptionTextDisabled);
    }

    return style;
  }, [
    notifCountEnabled,
    selected,
    styles.notificationOptionDescriptionText,
    styles.notificationOptionDescriptionTextDisabled,
    styles.notificationOptionDescriptionTextDisabledSelected,
  ]);

  let bannerNotifsIconColor = colors.panelForegroundSecondaryLabel;
  if (selected && !bannerNotifsEnabled) {
    bannerNotifsIconColor = colors.panelInputSecondaryForeground;
  } else if (!bannerNotifsEnabled) {
    bannerNotifsIconColor = colors.panelSecondaryForeground;
  }

  let notifCountIconColor = colors.panelForegroundSecondaryLabel;
  if (selected && !notifCountEnabled) {
    notifCountIconColor = colors.panelInputSecondaryForeground;
  } else if (!notifCountEnabled) {
    notifCountIconColor = colors.panelSecondaryForeground;
  }

  return (
    <>
      <View style={styles.notificationOptionDescriptionListItem}>
        <SWMansionIcon
          name={bannerNotifsEnabled ? 'check' : 'cross'}
          size={12}
          color={bannerNotifsIconColor}
        />
        <Text style={bannerNotifsDescriptionTextStyles}>
          {threadSettingsNotificationsCopy.BANNER_NOTIFS}
        </Text>
      </View>
      <View style={styles.notificationOptionDescriptionListItem}>
        <SWMansionIcon
          name={notifCountEnabled ? 'check' : 'cross'}
          size={12}
          color={notifCountIconColor}
        />
        <Text style={notifCountDescriptionTextStyles}>
          {threadSettingsNotificationsCopy.NOTIF_COUNT}
        </Text>
      </View>
      <View style={styles.notificationOptionDescriptionListItem}>
        <SWMansionIcon
          name="check"
          size={12}
          color={colors.panelForegroundSecondaryLabel}
        />
        <Text style={styles.notificationOptionDescriptionText}>
          {livesInHomeTab
            ? threadSettingsNotificationsCopy.IN_HOME_TAB
            : threadSettingsNotificationsCopy.IN_MUTED_TAB}
        </Text>
      </View>
    </>
  );
}

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
    onHomeSelected,
    onNotifCountOnlySelected,
    onMutedSelected,
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

  const notifCountOnlyIllustration = React.useMemo(
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

  const allNotificationsDescription = React.useMemo(
    () => (
      <NotificationDescription
        selected={notificationSettings === 'home'}
        bannerNotifsEnabled={true}
        notifCountEnabled={true}
        livesInHomeTab={true}
      />
    ),
    [notificationSettings],
  );

  const notifCountOnlyDescription = React.useMemo(
    () => (
      <NotificationDescription
        selected={notificationSettings === 'notif-count-only'}
        bannerNotifsEnabled={false}
        notifCountEnabled={true}
        livesInHomeTab={true}
      />
    ),
    [notificationSettings],
  );

  const mutedDescription = React.useMemo(
    () => (
      <NotificationDescription
        selected={notificationSettings === 'muted'}
        bannerNotifsEnabled={false}
        notifCountEnabled={false}
        livesInHomeTab={false}
      />
    ),
    [notificationSettings],
  );

  const threadSettingsNotifications = React.useMemo(() => {
    return (
      <View style={styles.container}>
        <View style={styles.enumSettingsOptionContainer}>
          <EnumSettingsOption
            name={threadSettingsNotificationsCopy.HOME}
            enumValue={notificationSettings === 'home'}
            onEnumValuePress={onHomeSelected}
            description={allNotificationsDescription}
            icon={allNotificationsIllustration}
          />
        </View>
        <View style={styles.enumSettingsOptionContainer}>
          <EnumSettingsOption
            name={threadSettingsNotificationsCopy.NOTIF_COUNT_ONLY}
            enumValue={notificationSettings === 'notif-count-only'}
            onEnumValuePress={onNotifCountOnlySelected}
            description={notifCountOnlyDescription}
            icon={notifCountOnlyIllustration}
          />
        </View>
        <View style={styles.enumSettingsOptionContainer}>
          <EnumSettingsOption
            name={threadSettingsNotificationsCopy.MUTED}
            enumValue={notificationSettings === 'muted'}
            onEnumValuePress={onMutedSelected}
            description={mutedDescription}
            icon={mutedIllustration}
          />
        </View>
      </View>
    );
  }, [
    styles.container,
    styles.enumSettingsOptionContainer,
    notificationSettings,
    onHomeSelected,
    allNotificationsDescription,
    allNotificationsIllustration,
    onNotifCountOnlySelected,
    notifCountOnlyDescription,
    notifCountOnlyIllustration,
    onMutedSelected,
    mutedDescription,
    mutedIllustration,
  ]);

  return threadSettingsNotifications;
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
  notificationOptionDescriptionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  notificationOptionDescriptionText: {
    color: 'panelForegroundSecondaryLabel',
    marginLeft: 4,
    fontSize: 14,
  },
  notificationOptionDescriptionTextDisabled: {
    textDecorationLine: 'line-through',
    color: 'panelSecondaryForeground',
  },
  notificationOptionDescriptionTextDisabledSelected: {
    color: 'panelInputSecondaryForeground',
    textDecorationLine: 'line-through',
  },
  noticeTextContainer: {
    padding: 16,
  },
  noticeText: {
    color: 'panelForegroundSecondaryLabel',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
    marginVertical: 8,
  },
};

export default ThreadSettingsNotifications;
