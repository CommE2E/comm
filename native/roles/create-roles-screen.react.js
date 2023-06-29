// @flow

import * as React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

import {
  configurableCommunityPermissions,
  configurableCommunityPermissionsOptions,
  type ConfigurableCommunityPermissionOption,
} from 'lib/types/thread-permission-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { getKeysByValue } from 'lib/utils/objects.js';

import type { RolesNavigationProp } from './roles-navigator.react.js';
import EnumSettingsOption from '../components/enum-settings-option.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import TextInput from '../components/text-input.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

export type CreateRolesScreenParams = {
  +threadInfo: ThreadInfo,
  +action: 'create_role' | 'edit_role',
};

type CreateRolesScreenProps = {
  +navigation: RolesNavigationProp<'CreateRolesScreen'>,
  +route: NavigationRoute<'CreateRolesScreen'>,
};

function CreateRolesScreen(props: CreateRolesScreenProps): React.Node {
  // eslint-disable-next-line no-unused-vars
  const { threadInfo, action } = props.route.params;

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

  const isUserFacingPermissionSelected = React.useCallback(
    (option: ConfigurableCommunityPermissionOption) => {
      const associatedPermissions = getKeysByValue(
        configurableCommunityPermissions,
        option,
      );

      return associatedPermissions.every(permission =>
        selectedPermissions.includes(permission),
      );
    },
    [selectedPermissions],
  );

  const onEnumValuePress = React.useCallback(
    (option: ConfigurableCommunityPermissionOption) => {
      // configurableCommunityPermissions is an object where one permission
      // is associated with exactly one user-facing option. This means that
      // permission propagation are classed as separate entries in the object.
      // So, for example, 'edit_entries' and 'descendants_edit_entries' are
      // separate entries in the object, but they are both associated with the
      // same user-facing option, 'Edit entries'. So when a user-facing option
      // is selected, we need to select all permissions associated with that.
      const associatedPermissions = getKeysByValue(
        configurableCommunityPermissions,
        option,
      );

      // Toggle the inclusivity of the permissions associated with the
      // user-facing option.
      if (isUserFacingPermissionSelected(option)) {
        setSelectedPermissions(currentPermissions =>
          currentPermissions.filter(
            permission => !associatedPermissions.includes(permission),
          ),
        );
      } else {
        setSelectedPermissions(currentPermissions => [
          ...currentPermissions,
          ...associatedPermissions,
        ]);
      }
    },
    [isUserFacingPermissionSelected],
  );

  const permissionsList = React.useMemo(
    () =>
      [...configurableCommunityPermissionsOptions].map(permission => (
        <EnumSettingsOption
          key={permission.title}
          name={permission.title}
          description={permission.description}
          enumValue={isUserFacingPermissionSelected(permission)}
          onEnumValuePress={() => onEnumValuePress(permission)}
        />
      )),
    [isUserFacingPermissionSelected, onEnumValuePress],
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
