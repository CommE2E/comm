// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import type { RelativeMemberInfo, ThreadInfo } from 'lib/types/thread-types.js';
import { values } from 'lib/utils/objects.js';

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

function ChangeRolesScreen(props: Props): React.Node {
  const { navigation } = props;
  const { threadInfo, memberInfo, role } = props.route.params;
  invariant(role, 'Role must be defined');

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

  const showActionSheet = React.useCallback(() => {
    const options = [
      ...roleOptions.map(roleOption => roleOption.name),
      'Cancel',
    ];

    const cancelButtonIndex = options.length - 1;
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        userInterfaceStyle: activeTheme ?? 'dark',
      },
      onRoleChange,
    );
  }, [roleOptions, onRoleChange, activeTheme, showActionSheetWithOptions]);

  return (
    <View>
      <View style={styles.descriptionBackground}>
        <Text style={styles.descriptionText}>
          Members can only be assigned one role at a time. Changing a
          member&rsquo;s role will replace their previously assigned role.
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <UserAvatar userID={memberInfo.id} size="large" />
        <Text style={styles.memberInfoUsername}>{memberInfo.username}</Text>
      </View>
      <View>
        <Text style={styles.roleSelectorLabel}>ROLE</Text>
        <TouchableOpacity onPress={showActionSheet} style={styles.roleSelector}>
          <Text style={styles.currentRole}>{selectedRoleName}</Text>
          <SWMansionIcon name="edit-1" size={20} style={styles.pencilIcon} />
        </TouchableOpacity>
      </View>
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
    letterSpacing: 0.3,
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
  pencilIcon: {
    color: 'panelInputSecondaryForeground',
  },
};

export default ChangeRolesScreen;
