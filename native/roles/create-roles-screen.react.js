// @flow

import * as React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

import { configurableCommunityPermissions } from 'lib/types/thread-permission-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import type { RolesNavigationProp } from './roles-navigator.react.js';
import EnumSettingsOption from '../components/enum-settings-option.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import TextInput from '../components/text-input.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

export type CreateRolesScreenParams = {
  +threadInfo: ThreadInfo,
};

type CreateRolesScreenProps = {
  +navigation: RolesNavigationProp<'CreateRolesScreen'>,
  +route: NavigationRoute<'CreateRolesScreen'>,
};

function CreateRolesScreen(props: CreateRolesScreenProps): React.Node {
  // eslint-disable-next-line no-unused-vars
  const { threadInfo } = props.route.params;

  const [customRoleName, setCustomRoleName] =
    React.useState<string>('New Role');
  const [selectedPermissions, setSelectedPermissions] = React.useState([]);

  const styles = useStyles(unboundStyles);

  const onClearPermissions = React.useCallback(() => {
    setSelectedPermissions([]);
  }, []);

  const isSelectedPermissionsEmpty = selectedPermissions.length === 0;
  const clearPermissionsText = React.useMemo(() => {
    if (isSelectedPermissionsEmpty) {
      return (
        <Text style={styles.clearPermissionsTextDisabled}>
          Clear permissions
        </Text>
      );
    }

    return (
      <TouchableOpacity onPress={onClearPermissions}>
        <Text style={styles.clearPermissionsText}>Clear permissions</Text>
      </TouchableOpacity>
    );
  }, [
    isSelectedPermissionsEmpty,
    onClearPermissions,
    styles.clearPermissionsText,
    styles.clearPermissionsTextDisabled,
  ]);

  const isPermissionSelected = React.useCallback(
    (permissions: $ReadOnlyArray<string>) =>
      permissions.some(permission => selectedPermissions.includes(permission)),
    [selectedPermissions],
  );

  const onEnumValuePress = React.useCallback(
    (permissions: $ReadOnlyArray<string>) => {
      if (isPermissionSelected(permissions)) {
        setSelectedPermissions(currentPermissions =>
          currentPermissions.filter(
            permission => !permissions.includes(permission),
          ),
        );
      } else {
        setSelectedPermissions(currentPermissions => [
          ...currentPermissions,
          ...permissions,
        ]);
      }
    },
    [isPermissionSelected],
  );
  console.log(selectedPermissions);

  const permissionsList = React.useMemo(
    () =>
      configurableCommunityPermissions.map(permission => (
        <EnumSettingsOption
          key={permission.title}
          name={permission.title}
          description={permission.description}
          enumValue={isPermissionSelected(permission.permissions)}
          onEnumValuePress={() => onEnumValuePress(permission.permissions)}
        />
      )),
    [isPermissionSelected, onEnumValuePress],
  );

  const onChangeRoleNameInput = React.useCallback((roleName: string) => {
    setCustomRoleName(roleName);
  }, []);

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
