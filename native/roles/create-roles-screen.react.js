// @flow

import * as React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { modifyCommunityRoleActionTypes } from 'lib/actions/thread-action-types.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import {
  type UserSurfacedPermission,
  type UserSurfacedPermissionOption,
  userSurfacedPermissionOptions,
} from 'lib/types/thread-permission-types.js';

import CreateRolesHeaderRightButton from './create-roles-header-right-button.react.js';
import type { RolesNavigationProp } from './roles-navigator.react.js';
import EnumSettingsOption from '../components/enum-settings-option.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import TextInput from '../components/text-input.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

export type CreateRolesScreenParams = {
  +threadInfo: ThreadInfo,
  +action: 'create_role' | 'edit_role',
  +existingRoleID?: string,
  +roleName: string,
  +rolePermissions: $ReadOnlySet<UserSurfacedPermission>,
};

type CreateRolesScreenProps = {
  +navigation: RolesNavigationProp<'CreateRolesScreen'>,
  +route: NavigationRoute<'CreateRolesScreen'>,
};

const createRolesLoadingStatusSelector = createLoadingStatusSelector(
  modifyCommunityRoleActionTypes,
);

function CreateRolesScreen(props: CreateRolesScreenProps): React.Node {
  const {
    threadInfo,
    action,
    existingRoleID,
    roleName: defaultRoleName,
    rolePermissions: defaultRolePermissions,
  } = props.route.params;

  const createRolesLoadingStatus: LoadingStatus = useSelector(
    createRolesLoadingStatusSelector,
  );

  const [customRoleName, setCustomRoleName] =
    React.useState<string>(defaultRoleName);
  const [selectedPermissions, setSelectedPermissions] = React.useState<
    $ReadOnlySet<UserSurfacedPermission>,
  >(defaultRolePermissions);

  const [roleCreationFailed, setRoleCreationFailed] =
    React.useState<boolean>(false);

  const styles = useStyles(unboundStyles);

  const errorStyles = React.useMemo(
    () =>
      roleCreationFailed
        ? [styles.errorContainer, styles.errorContainerVisible]
        : styles.errorContainer,
    [roleCreationFailed, styles.errorContainer, styles.errorContainerVisible],
  );

  const onClearPermissions = React.useCallback(() => {
    setSelectedPermissions(new Set());
  }, []);

  const isSelectedPermissionsEmpty = selectedPermissions.size === 0;
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
      selectedPermissions.has(option.userSurfacedPermission),
    [selectedPermissions],
  );

  const onEnumValuePress = React.useCallback(
    (option: UserSurfacedPermissionOption) =>
      setSelectedPermissions(currentPermissions => {
        if (currentPermissions.has(option.userSurfacedPermission)) {
          const newPermissions = new Set(currentPermissions);
          newPermissions.delete(option.userSurfacedPermission);
          return newPermissions;
        } else {
          return new Set([
            ...currentPermissions,
            option.userSurfacedPermission,
          ]);
        }
      }),
    [],
  );

  React.useEffect(
    () =>
      props.navigation.setParams({
        threadInfo,
        action,
        existingRoleID,
        roleName: customRoleName,
        rolePermissions: selectedPermissions,
      }),
    [
      props.navigation,
      threadInfo,
      action,
      existingRoleID,
      customRoleName,
      selectedPermissions,
    ],
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
          type="checkbox"
        />
      )),
    [isUserSurfacedPermissionSelected, onEnumValuePress],
  );

  const onChangeRoleNameInput = React.useCallback((roleName: string) => {
    setRoleCreationFailed(false);
    setCustomRoleName(roleName);
  }, []);

  React.useEffect(
    () =>
      props.navigation.setOptions({
        headerRight: () => {
          if (createRolesLoadingStatus === 'loading') {
            return (
              <ActivityIndicator
                size="small"
                color="white"
                style={styles.activityIndicator}
              />
            );
          }

          return (
            <CreateRolesHeaderRightButton
              route={props.route}
              setRoleCreationFailed={setRoleCreationFailed}
            />
          );
        },
      }),
    [
      createRolesLoadingStatus,
      props.navigation,
      styles.activityIndicator,
      props.route,
    ],
  );

  const createRolesScreen = React.useMemo(
    () => (
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
          <View style={errorStyles}>
            <Text style={styles.errorText}>
              There is already a role with this name in the community
            </Text>
          </View>
        </View>
        <View style={styles.permissionsContainer}>
          <View style={styles.permissionsHeader}>
            <Text style={styles.permissionsText}>PERMISSIONS</Text>
            {clearPermissionsText}
          </View>
          <ScrollView
            style={styles.permissionsListContainer}
            contentContainerStyle={styles.permissionsListContentContainer}
          >
            {permissionsList}
          </ScrollView>
        </View>
      </View>
    ),
    [
      clearPermissionsText,
      customRoleName,
      errorStyles,
      onChangeRoleNameInput,
      permissionsList,
      styles.errorText,
      styles.pencilIcon,
      styles.permissionsContainer,
      styles.permissionsHeader,
      styles.permissionsListContainer,
      styles.permissionsListContentContainer,
      styles.permissionsText,
      styles.roleInput,
      styles.roleInputComponent,
      styles.roleNameContainer,
      styles.roleNameText,
    ],
  );

  return createRolesScreen;
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
    color: 'panelForegroundLabel',
    fontSize: 16,
  },
  pencilIcon: {
    color: 'panelInputSecondaryForeground',
  },
  errorContainer: {
    marginTop: 10,
    alignItems: 'center',
    opacity: 0,
  },
  errorContainerVisible: {
    opacity: 1,
  },
  errorText: {
    color: 'redText',
    fontSize: 14,
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
  permissionsListContentContainer: {
    paddingTop: 4,
    paddingBottom: 56,
  },
  activityIndicator: {
    paddingRight: 15,
  },
};

export default CreateRolesScreen;
