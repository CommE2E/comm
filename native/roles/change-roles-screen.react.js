// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import invariant from 'invariant';
import * as React from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { changeThreadMemberRolesActionTypes } from 'lib/actions/thread-action-types.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { otherUsersButNoOtherAdmins } from 'lib/selectors/thread-selectors.js';
import { roleIsAdminRole } from 'lib/shared/thread-utils.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { values } from 'lib/utils/objects.js';

import ChangeRolesHeaderRightButton from './change-roles-header-right-button.react.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import type { ChatNavigationProp } from '../chat/chat.react';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

export type ChangeRolesScreenParams = {
  +threadInfo: ThreadInfo,
  +memberInfo: RelativeMemberInfo,
  +role: ?string,
};

type Props = {
  +navigation: ChatNavigationProp<'ChangeRolesScreen'>,
  +route: NavigationRoute<'ChangeRolesScreen'>,
};

const changeRolesLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadMemberRolesActionTypes,
);

function ChangeRolesScreen(props: Props): React.Node {
  const { navigation, route } = props;
  const { threadInfo, memberInfo, role } = props.route.params;
  invariant(role, 'Role must be defined');

  const changeRolesLoadingStatus: LoadingStatus = useSelector(
    changeRolesLoadingStatusSelector,
  );

  const styles = useStyles(unboundStyles);

  const [selectedRole, setSelectedRole] = React.useState<string>(role);
  const roleOptions = React.useMemo(
    () =>
      values(threadInfo.roles).map(threadRole => ({
        id: threadRole.id,
        name: threadRole.name,
      })),
    [threadInfo.roles],
  );
  const selectedRoleName = React.useMemo(
    () => roleOptions.find(roleOption => roleOption.id === selectedRole)?.name,
    [roleOptions, selectedRole],
  );

  const onRoleChange = React.useCallback(
    (selectedIndex: ?number) => {
      if (
        selectedIndex === undefined ||
        selectedIndex === null ||
        selectedIndex === roleOptions.length
      ) {
        return;
      }

      const newRole = roleOptions[selectedIndex].id;

      setSelectedRole(newRole);
      navigation.setParams({
        threadInfo,
        memberInfo,
        role: newRole,
      });
    },
    [navigation, setSelectedRole, roleOptions, memberInfo, threadInfo],
  );

  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const { showActionSheetWithOptions } = useActionSheet();
  const insets = useSafeAreaInsets();

  const showActionSheet = React.useCallback(() => {
    const options =
      Platform.OS === 'ios'
        ? [...roleOptions.map(roleOption => roleOption.name), 'Cancel']
        : [...roleOptions.map(roleOption => roleOption.name)];

    const cancelButtonIndex = Platform.OS === 'ios' ? options.length - 1 : -1;

    const containerStyle = {
      paddingBottom: insets.bottom,
    };

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        containerStyle,
        userInterfaceStyle: activeTheme ?? 'dark',
      },
      onRoleChange,
    );
  }, [
    roleOptions,
    onRoleChange,
    insets.bottom,
    activeTheme,
    showActionSheetWithOptions,
  ]);

  const otherUsersButNoOtherAdminsValue = useSelector(
    otherUsersButNoOtherAdmins(threadInfo.id),
  );

  const memberIsAdmin = React.useMemo(() => {
    invariant(memberInfo.role, 'Expected member role to be defined');
    return roleIsAdminRole(threadInfo.roles[memberInfo.role]);
  }, [threadInfo.roles, memberInfo.role]);

  const shouldRoleChangeBeDisabled = React.useMemo(
    () => otherUsersButNoOtherAdminsValue && memberIsAdmin,
    [otherUsersButNoOtherAdminsValue, memberIsAdmin],
  );

  const roleSelector = React.useMemo(() => {
    if (shouldRoleChangeBeDisabled) {
      return (
        <View style={styles.roleSelector}>
          <Text style={styles.disabledCurrentRole}>{selectedRoleName}</Text>
          <SWMansionIcon
            name="edit-1"
            size={20}
            style={styles.disabledPencilIcon}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity onPress={showActionSheet} style={styles.roleSelector}>
        <Text style={styles.currentRole}>{selectedRoleName}</Text>
        <SWMansionIcon name="edit-1" size={20} style={styles.pencilIcon} />
      </TouchableOpacity>
    );
  }, [showActionSheet, styles, selectedRoleName, shouldRoleChangeBeDisabled]);

  const disabledRoleChangeMessage = React.useMemo(() => {
    if (!shouldRoleChangeBeDisabled) {
      return null;
    }

    return (
      <View style={styles.disabledWarningBackground}>
        <SWMansionIcon name="info-circle" size={24} style={styles.infoIcon} />
        <Text style={styles.disabledWarningText}>
          There must be at least one admin at any given time in a community.
        </Text>
      </View>
    );
  }, [
    shouldRoleChangeBeDisabled,
    styles.disabledWarningBackground,
    styles.infoIcon,
    styles.disabledWarningText,
  ]);

  React.useEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        if (changeRolesLoadingStatus === 'loading') {
          return (
            <ActivityIndicator
              size="small"
              color="white"
              style={styles.activityIndicator}
            />
          );
        }
        return (
          <ChangeRolesHeaderRightButton
            route={route}
            shouldRoleChangeBeDisabled={shouldRoleChangeBeDisabled}
          />
        );
      },
    });
  }, [
    changeRolesLoadingStatus,
    navigation,
    styles.activityIndicator,
    route,
    shouldRoleChangeBeDisabled,
  ]);

  return (
    <View>
      <View style={styles.descriptionBackground}>
        <Text style={styles.descriptionText}>
          Members can only be assigned one role at a time. Changing a
          member&rsquo;s role will replace their previously assigned role.
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <UserAvatar userID={memberInfo.id} size="XL" />
        <Text style={styles.memberInfoUsername}>{memberInfo.username}</Text>
      </View>
      {roleSelector}
      {disabledRoleChangeMessage}
    </View>
  );
}

const unboundStyles = {
  descriptionBackground: {
    backgroundColor: 'panelForeground',
    marginBottom: 20,
  },
  descriptionText: {
    color: 'panelBackgroundLabel',
    padding: 16,
    fontSize: 14,
  },
  memberInfo: {
    backgroundColor: 'panelForeground',
    padding: 16,
    marginBottom: 30,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  memberInfoUsername: {
    color: 'panelForegroundLabel',
    marginTop: 8,
    fontSize: 18,
    fontWeight: '500',
  },
  roleSelectorLabel: {
    color: 'panelForegroundSecondaryLabel',
    marginLeft: 8,
    fontSize: 12,
  },
  roleSelector: {
    backgroundColor: 'panelForeground',
    marginTop: 8,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currentRole: {
    color: 'panelForegroundSecondaryLabel',
    fontSize: 16,
  },
  disabledCurrentRole: {
    color: 'disabledButton',
    fontSize: 16,
  },
  pencilIcon: {
    color: 'panelInputSecondaryForeground',
  },
  disabledPencilIcon: {
    color: 'disabledButton',
  },
  disabledWarningBackground: {
    backgroundColor: 'disabledButton',
    padding: 16,
    display: 'flex',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '75%',
    alignSelf: 'center',
  },
  disabledWarningText: {
    color: 'panelForegroundSecondaryLabel',
    fontSize: 14,
    marginRight: 8,
    display: 'flex',
  },
  infoIcon: {
    color: 'panelForegroundSecondaryLabel',
    marginRight: 8,
    marginLeft: 8,
    marginBottom: 12,
  },
  activityIndicator: {
    paddingRight: 15,
  },
};

export default ChangeRolesScreen;
