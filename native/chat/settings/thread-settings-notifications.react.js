// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import { useThreadSettingsNotifications } from 'lib/shared/thread-settings-notifications-utils.js';
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
  +bannerNotifsEnabled: boolean,
  +badgeCountEnabled: boolean,
  +livesInFocusedTab: boolean,
};

function NotificationDescription(
  props: NotificationDescriptionProps,
): React.Node {
  const { bannerNotifsEnabled, badgeCountEnabled, livesInFocusedTab } = props;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const bannerNotifsDescriptionTextStyles = React.useMemo(() => {
    const style = [styles.notificationOptionDescriptionText];

    if (!bannerNotifsEnabled) {
      style.push(styles.notificationOptionDescriptionTextDisabled);
    }

    return style;
  }, [
    bannerNotifsEnabled,
    styles.notificationOptionDescriptionText,
    styles.notificationOptionDescriptionTextDisabled,
  ]);

  const badgeCountDescriptionTextStyles = React.useMemo(() => {
    const style = [styles.notificationOptionDescriptionText];

    if (!badgeCountEnabled) {
      style.push(styles.notificationOptionDescriptionTextDisabled);
    }

    return style;
  }, [
    badgeCountEnabled,
    styles.notificationOptionDescriptionText,
    styles.notificationOptionDescriptionTextDisabled,
  ]);

  return (
    <>
      <View style={styles.notificationOptionDescriptionListItem}>
        <SWMansionIcon
          name={bannerNotifsEnabled ? 'check' : 'cross'}
          size={12}
          color={
            bannerNotifsEnabled
              ? colors.panelForegroundSecondaryLabel
              : colors.panelSecondaryForeground
          }
        />
        <Text style={bannerNotifsDescriptionTextStyles}>Banner notifs</Text>
      </View>
      <View style={styles.notificationOptionDescriptionListItem}>
        <SWMansionIcon
          name={badgeCountEnabled ? 'check' : 'cross'}
          size={12}
          color={
            badgeCountEnabled
              ? colors.panelForegroundSecondaryLabel
              : colors.panelSecondaryForeground
          }
        />
        <Text style={badgeCountDescriptionTextStyles}>Badge count</Text>
      </View>
      <View style={styles.notificationOptionDescriptionListItem}>
        <SWMansionIcon
          name="check"
          size={12}
          color={colors.panelForegroundSecondaryLabel}
        />
        <Text style={styles.notificationOptionDescriptionText}>
          Lives in {livesInFocusedTab ? 'Focused' : 'Background'} tab
        </Text>
      </View>
    </>
  );
}

const allNotificationsDescription = (
  <NotificationDescription
    bannerNotifsEnabled={true}
    badgeCountEnabled={true}
    livesInFocusedTab={true}
  />
);

const badgeOnlyDescription = (
  <NotificationDescription
    bannerNotifsEnabled={false}
    badgeCountEnabled={true}
    livesInFocusedTab={true}
  />
);

const mutedDescription = (
  <NotificationDescription
    bannerNotifsEnabled={false}
    badgeCountEnabled={false}
    livesInFocusedTab={false}
  />
);

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
    disableSaveButton,
    onSave,
  } = useThreadSettingsNotifications(threadInfo, goBack);

  React.useEffect(() => {
    setOptions({
      headerRight: () => (
        <HeaderRightTextButton
          label="Save"
          onPress={onSave}
          disabled={disableSaveButton}
        />
      ),
    });
  }, [disableSaveButton, onSave, setOptions]);

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
    <>
      <View style={styles.enumSettingsOptionContainer}>
        <EnumSettingsOption
          name="Focused (enabled)"
          enumValue={notificationSettings === 'focused'}
          onEnumValuePress={onFocusedSelected}
          description={allNotificationsDescription}
          icon={allNotificationsIllustration}
        />
      </View>
      <View style={styles.enumSettingsOptionContainer}>
        <EnumSettingsOption
          name="Focused (badge only)"
          enumValue={notificationSettings === 'badge-only'}
          onEnumValuePress={onBadgeOnlySelected}
          description={badgeOnlyDescription}
          icon={badgeOnlyIllustration}
        />
      </View>
      <View style={styles.enumSettingsOptionContainer}>
        <EnumSettingsOption
          name="Background"
          enumValue={notificationSettings === 'background'}
          onEnumValuePress={onBackgroundSelected}
          description={mutedDescription}
          icon={mutedIllustration}
        />
      </View>
    </>
  );
}

const unboundStyles = {
  enumSettingsOptionContainer: {
    paddingVertical: 8,
    backgroundColor: 'panelForeground',
  },
  notificationOptionIconContainer: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  notificationOptionDescriptionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  notificationOptionDescriptionText: {
    color: 'panelForegroundSecondaryLabel',
    marginLeft: 4,
    fontSize: 12,
  },
  notificationOptionDescriptionTextDisabled: {
    textDecorationLine: 'line-through',
    color: 'panelSecondaryForeground',
  },
};

export default ThreadSettingsNotifications;
