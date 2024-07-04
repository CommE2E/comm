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
  +livesInFocusedTab: boolean,
};

function NotificationDescription(
  props: NotificationDescriptionProps,
): React.Node {
  const {
    selected,
    bannerNotifsEnabled,
    notifCountEnabled,
    livesInFocusedTab,
  } = props;

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
          {livesInFocusedTab
            ? threadSettingsNotificationsCopy.IN_FOCUSED_TAB
            : threadSettingsNotificationsCopy.IN_BACKGROUND_TAB}
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
    onFocusedSelected,
    onBadgeOnlySelected,
    onBackgroundSelected,
    saveButtonDisabled,
    onSave,
    isSidebar,
    canPromoteSidebar,
    parentThreadIsInBackground,
  } = useThreadSettingsNotifications(threadInfo, goBack);

  React.useEffect(() => {
    setOptions({
      headerRight: () =>
        parentThreadIsInBackground ? null : (
          <HeaderRightTextButton
            label="Save"
            onPress={onSave}
            disabled={saveButtonDisabled}
          />
        ),
    });
  }, [saveButtonDisabled, onSave, setOptions, parentThreadIsInBackground]);

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

  const allNotificationsDescription = React.useMemo(
    () => (
      <NotificationDescription
        selected={notificationSettings === 'focused'}
        bannerNotifsEnabled={true}
        notifCountEnabled={true}
        livesInFocusedTab={true}
      />
    ),
    [notificationSettings],
  );

  const badgeOnlyDescription = React.useMemo(
    () => (
      <NotificationDescription
        selected={notificationSettings === 'badge-only'}
        bannerNotifsEnabled={false}
        notifCountEnabled={true}
        livesInFocusedTab={true}
      />
    ),
    [notificationSettings],
  );

  const mutedDescription = React.useMemo(
    () => (
      <NotificationDescription
        selected={notificationSettings === 'background'}
        bannerNotifsEnabled={false}
        notifCountEnabled={false}
        livesInFocusedTab={false}
      />
    ),
    [notificationSettings],
  );

  const noticeText = React.useMemo(() => {
    if (!isSidebar) {
      return null;
    }

    return (
      <View style={styles.noticeTextContainer}>
        <Text style={styles.noticeText}>
          {threadSettingsNotificationsCopy.IS_SIDEBAR}
        </Text>
        <Text style={styles.noticeText}>
          {canPromoteSidebar
            ? threadSettingsNotificationsCopy.IS_SIDEBAR_CAN_PROMOTE
            : threadSettingsNotificationsCopy.IS_SIDEBAR_CAN_NOT_PROMOTE}
        </Text>
      </View>
    );
  }, [
    canPromoteSidebar,
    isSidebar,
    styles.noticeText,
    styles.noticeTextContainer,
  ]);

  const threadSettingsNotifications = React.useMemo(() => {
    if (parentThreadIsInBackground) {
      return (
        <View style={styles.parentThreadIsInBackgroundNoticeContainerStyle}>
          <Text style={styles.parentThreadIsInBackgroundNoticeText}>
            {threadSettingsNotificationsCopy.PARENT_THREAD_IS_BACKGROUND}
          </Text>
          <Text style={styles.parentThreadIsInBackgroundNoticeText}>
            {canPromoteSidebar
              ? threadSettingsNotificationsCopy.PARENT_THREAD_IS_BACKGROUND_CAN_PROMOTE
              : threadSettingsNotificationsCopy.PARENT_THREAD_IS_BACKGROUND_CAN_NOT_PROMOTE}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.enumSettingsOptionContainer}>
          <EnumSettingsOption
            name={threadSettingsNotificationsCopy.FOCUSED}
            enumValue={notificationSettings === 'focused'}
            onEnumValuePress={onFocusedSelected}
            description={allNotificationsDescription}
            icon={allNotificationsIllustration}
          />
        </View>
        <View style={styles.enumSettingsOptionContainer}>
          <EnumSettingsOption
            name={threadSettingsNotificationsCopy.BADGE_ONLY}
            enumValue={notificationSettings === 'badge-only'}
            onEnumValuePress={onBadgeOnlySelected}
            description={badgeOnlyDescription}
            icon={badgeOnlyIllustration}
          />
        </View>
        <View style={styles.enumSettingsOptionContainer}>
          <EnumSettingsOption
            name={threadSettingsNotificationsCopy.BACKGROUND}
            enumValue={notificationSettings === 'background'}
            onEnumValuePress={onBackgroundSelected}
            description={mutedDescription}
            icon={mutedIllustration}
            disabled={isSidebar}
          />
        </View>
        {noticeText}
      </View>
    );
  }, [
    allNotificationsDescription,
    allNotificationsIllustration,
    badgeOnlyDescription,
    badgeOnlyIllustration,
    canPromoteSidebar,
    isSidebar,
    mutedDescription,
    mutedIllustration,
    noticeText,
    notificationSettings,
    onBackgroundSelected,
    onBadgeOnlySelected,
    onFocusedSelected,
    parentThreadIsInBackground,
    styles.container,
    styles.enumSettingsOptionContainer,
    styles.parentThreadIsInBackgroundNoticeContainerStyle,
    styles.parentThreadIsInBackgroundNoticeText,
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
  parentThreadIsInBackgroundNoticeContainerStyle: {
    backgroundColor: 'panelForeground',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  parentThreadIsInBackgroundNoticeText: {
    color: 'panelForegroundSecondaryLabel',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'left',
    marginVertical: 8,
  },
};

export default ThreadSettingsNotifications;
