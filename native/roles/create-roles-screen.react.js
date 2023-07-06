// @flow

import * as React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

import {
  userSurfacedPermissionOptions,
  type UserSurfacedPermissionOption,
  type UserSurfacedPermission,
} from 'lib/types/thread-permission-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import CreateRolesHeaderRightButton from './create-roles-header-right-button.react.js';
import type { RolesNavigationProp } from './roles-navigator.react.js';
import EnumSettingsOption from '../components/enum-settings-option.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import TextInput from '../components/text-input.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

export type CreateRolesScreenParams = {
  +threadInfo: ThreadInfo,
  +action: 'create_role' | 'edit_role',
  +roleName: string,
  +rolePermissions: UserSurfacedPermission[],
};

type CreateRolesScreenProps = {
  +navigation: RolesNavigationProp<'CreateRolesScreen'>,
  +route: NavigationRoute<'CreateRolesScreen'>,
};

function CreateRolesScreen(props: CreateRolesScreenProps): React.Node {
  const {
    threadInfo,
    action,
    roleName: defaultRoleName,
    rolePermissions: defaultRolePermissions,
  } = props.route.params;

  const [customRoleName, setCustomRoleName] =
    React.useState<string>(defaultRoleName);
  const [selectedPermissions, setSelectedPermissions] = React.useState<
    UserSurfacedPermission[],
  >(defaultRolePermissions);

  const styles = useStyles(unboundStyles);

  const onClearPermissions = React.useCallback(() => {
    setSelectedPermissions([]);
  }, []);

  const isSelectedPermissionsEmpty = selectedPermissions.length === 0;
  const clearPermissionsText = React.useMemo(() => {
    const textStyle = isSelectedPermissionsEmpty
      ? styles.clearPermissionsTextDisabled
      : styles.clearPermissionsText;

    return (
      <TouchableOpacity
        onPress={onClearPermissions}
        disabled={isSelectedPermissionsEmpty}
      >
        <Text style={textStyle}>Clear permissions</Text>
      </TouchableOpacity>
    );
  }, [
    isSelectedPermissionsEmpty,
    onClearPermissions,
    styles.clearPermissionsText,
    styles.clearPermissionsTextDisabled,
  ]);

  const isUserSurfacedPermissionSelected = React.useCallback(
    (option: UserSurfacedPermissionOption) =>
      selectedPermissions.includes(option.userSurfacedPermission),
    [selectedPermissions],
  );

  const onEnumValuePress = React.useCallback(
    (option: UserSurfacedPermissionOption) => {
      if (isUserSurfacedPermissionSelected(option)) {
        setSelectedPermissions(currentPermissions =>
          currentPermissions.filter(
            permission => permission !== option.userSurfacedPermission,
          ),
        );
      } else {
        setSelectedPermissions(currentPermissions => [
          ...currentPermissions,
          option.userSurfacedPermission,
        ]);
      }
    },
    [isUserSurfacedPermissionSelected],
  );

  React.useEffect(
    () =>
      props.navigation.setParams({
        threadInfo,
        action,
        roleName: customRoleName,
        rolePermissions: selectedPermissions,
      }),
    [props.navigation, threadInfo, action, customRoleName, selectedPermissions],
  );

  const permissionsList = React.useMemo(
    () =>
      [...userSurfacedPermissionOptions].map(permission => (
        <EnumSettingsOption
          key={permission.title}
          name={permission.title}
          description={permission.description}
          enumValue={isUserSurfacedPermissionSelected(permission)}
          onEnumValuePress={() => onEnumValuePress(permission)}
        />
      )),
    [isUserSurfacedPermissionSelected, onEnumValuePress],
  );

  const onChangeRoleNameInput = React.useCallback((roleName: string) => {
    setCustomRoleName(roleName);
  }, []);

  React.useEffect(
    () =>
      props.navigation.setOptions({
        // eslint-disable-next-line react/display-name
        headerRight: () => <CreateRolesHeaderRightButton route={props.route} />,
      }),
    [props.navigation, props.route],
  );

  return (
    <View>
      <View style={styles.roleNameContainer}>
        <Text style={styles.roleNameText}>ROLE NAME</Text>
        <View style={styles.roleInput}>
          <TextInput
            style={styles.roleInputComponent}
            value={customRoleName}
            onChangeText={onChangeRoleNameInput}
            editable={true}
          />
          <SWMansionIcon name="edit-1" size={20} style={styles.pencilIcon} />
        </View>
      </View>
      <View style={styles.permissionsContainer}>
        <View style={styles.permissionsHeader}>
          <Text style={styles.permissionsText}>PERMISSIONS</Text>
          {clearPermissionsText}
        </View>
        <ScrollView style={styles.permissionsListContainer}>
          {permissionsList}
        </ScrollView>
      </View>
    </View>
  );
}

const unboundStyles = {
  roleNameContainer: {
    marginTop: 30,
  },
  roleNameText: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    marginBottom: 5,
    marginLeft: 10,
  },
  roleInput: {
    backgroundColor: 'panelForeground',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleInputComponent: {
    color: 'whiteText',
    fontSize: 16,
  },
  pencilIcon: {
    color: 'panelInputSecondaryForeground',
  },
  permissionsContainer: {
    marginTop: 20,
    paddingBottom: 220,
  },
  permissionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  permissionsText: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    marginLeft: 10,
  },
  clearPermissionsText: {
    color: 'purpleLink',
    fontSize: 12,
    marginRight: 15,
  },
  clearPermissionsTextDisabled: {
    color: 'disabledButton',
    fontSize: 12,
    marginRight: 15,
  },
  permissionsListContainer: {
    backgroundColor: 'panelForeground',
    marginTop: 10,
  },
};

export default CreateRolesScreen;
