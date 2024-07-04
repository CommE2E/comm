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
  +badgeCountEnabled: boolean,
  +livesInFocusedTab: boolean,
};

function NotificationDescription(
  props: NotificationDescriptionProps,
): React.Node {
  const {
    selected,
    bannerNotifsEnabled,
    badgeCountEnabled,
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

  const badgeCountDescriptionTextStyles = React.useMemo(() => {
    const style = [styles.notificationOptionDescriptionText];

    if (selected && !badgeCountEnabled) {
      style.push(styles.notificationOptionDescriptionTextDisabledSelected);
    } else if (!badgeCountEnabled) {
      style.push(styles.notificationOptionDescriptionTextDisabled);
    }

    return style;
  }, [
    badgeCountEnabled,
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

  let badgeCountIconColor = colors.panelForegroundSecondaryLabel;
  if (selected && !badgeCountEnabled) {
    badgeCountIconColor = colors.panelInputSecondaryForeground;
  } else if (!badgeCountEnabled) {
    badgeCountIconColor = colors.panelSecondaryForeground;
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
          name={badgeCountEnabled ? 'check' : 'cross'}
          size={12}
          color={badgeCountIconColor}
        />
        <Text style={badgeCountDescriptionTextStyles}>
          {threadSettingsNotificationsCopy.BADGE_COUNT}
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

  const allNotificationsDescription = React.useMemo(
    () => (
      <NotificationDescription
        selected={notificationSettings === 'focused'}
        bannerNotifsEnabled={true}
        badgeCountEnabled={true}
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
        badgeCountEnabled={true}
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
        badgeCountEnabled={false}
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
