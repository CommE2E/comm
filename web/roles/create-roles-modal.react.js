// @flow

import classNames from 'classnames';
import * as React from 'react';

import {
  modifyCommunityRole,
  modifyCommunityRoleActionTypes,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import { type UserSurfacedPermission } from 'lib/types/thread-permission-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';
import { values } from 'lib/utils/objects.js';

import css from './create-roles-modal.css';
import {
  modifyUserSurfacedPermissionOptions,
  type ModifiedUserSurfacedPermissionOption,
} from './role-utils.react.js';
import Button, { buttonThemes } from '../components/button.react.js';
import EnumSettingsOption from '../components/enum-settings-option.react.js';
import LoadingIndicator from '../loading-indicator.react.js';
import Input from '../modals/input.react.js';
import Modal from '../modals/modal.react.js';
import UnsavedChangesModal from '../modals/unsaved-changes-modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

const createRolesLoadingStatusSelector = createLoadingStatusSelector(
  modifyCommunityRoleActionTypes,
);

type CreateRolesModalProps = {
  +threadInfo: ThreadInfo,
  +action: 'create_role' | 'edit_role',
  +existingRoleID?: string,
  +roleName: string,
  +rolePermissions: $ReadOnlyArray<UserSurfacedPermission>,
};

function CreateRolesModal(props: CreateRolesModalProps): React.Node {
  const { pushModal, popModal } = useModalContext();
  const { threadInfo, action, existingRoleID, roleName, rolePermissions } =
    props;

  const callModifyCommunityRole = useServerCall(modifyCommunityRole);
  const dispatchActionPromise = useDispatchActionPromise();

  const createRolesLoadingStatus: LoadingStatus = useSelector(
    createRolesLoadingStatusSelector,
  );

  const [pendingRoleName, setPendingRoleName] =
    React.useState<string>(roleName);
  const [pendingRolePermissions, setPendingRolePermissions] =
    React.useState<$ReadOnlyArray<UserSurfacedPermission>>(rolePermissions);

  const [roleCreationFailed, setRoleCreationFailed] =
    React.useState<boolean>(false);

  const createButtonText = action === 'create_role' ? 'Create' : 'Save';

  const onChangeRoleName = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      setRoleCreationFailed(false);
      setPendingRoleName(event.currentTarget.value);
    },
    [],
  );

  const onCloseModal = React.useCallback(() => {
    const pendingSet = new Set(pendingRolePermissions);
    const roleSet = new Set(rolePermissions);

    let arePermissionsEqual = true;
    if (pendingSet.size !== roleSet.size) {
      arePermissionsEqual = false;
    }
    for (const permission of pendingSet) {
      if (!roleSet.has(permission)) {
        arePermissionsEqual = false;
        break;
      }
    }

    if (pendingRoleName === roleName && arePermissionsEqual) {
      popModal();
      return;
    }

    pushModal(<UnsavedChangesModal />);
  }, [
    pendingRoleName,
    roleName,
    pendingRolePermissions,
    rolePermissions,
    pushModal,
    popModal,
  ]);

  const clearPermissionsClassNames = classNames({
    [css.clearPermissions]: true,
    [css.clearPermissionsDisabled]: pendingRolePermissions.length === 0,
    [css.clearPermissionsEnabled]: pendingRolePermissions.length > 0,
  });

  const onClearPermissions = React.useCallback(
    () => setPendingRolePermissions([]),
    [],
  );

  const isUserSurfacedPermissionSelected = React.useCallback(
    (option: ModifiedUserSurfacedPermissionOption) =>
      pendingRolePermissions.includes(option.userSurfacedPermission),
    [pendingRolePermissions],
  );

  const onEnumValuePress = React.useCallback(
    (option: ModifiedUserSurfacedPermissionOption) =>
      setPendingRolePermissions(currentPermissions => {
        if (currentPermissions.includes(option.userSurfacedPermission)) {
          return currentPermissions.filter(
            permission => permission !== option.userSurfacedPermission,
          );
        } else {
          return [...currentPermissions, option.userSurfacedPermission];
        }
      }),
    [],
  );

  const modifiedUserSurfacedPermissionOptions = React.useMemo(
    () => modifyUserSurfacedPermissionOptions(threadInfo),
    [threadInfo],
  );

  const permissionsList = React.useMemo(
    () =>
      [...modifiedUserSurfacedPermissionOptions].map(permission => (
        <EnumSettingsOption
          key={permission.userSurfacedPermission}
          selected={isUserSurfacedPermissionSelected(permission)}
          onSelect={() => onEnumValuePress(permission)}
          icon={null}
          title={permission.title}
          type="checkbox"
          statements={permission.statements}
        />
      )),
    [
      modifiedUserSurfacedPermissionOptions,
      isUserSurfacedPermissionSelected,
      onEnumValuePress,
    ],
  );

  const errorMessageClassNames = classNames({
    [css.errorMessage]: true,
    [css.errorMessageVisible]: roleCreationFailed,
  });

  const onClickCreateRole = React.useCallback(() => {
    const threadRoleNames = values(threadInfo.roles).map(role => role.name);
    if (threadRoleNames.includes(pendingRoleName) && action === 'create_role') {
      setRoleCreationFailed(true);
      return;
    }

    dispatchActionPromise(
      modifyCommunityRoleActionTypes,
      (async () => {
        //eslint-disable-next-line no-useless-catch
        try {
          const response = await callModifyCommunityRole({
            community: threadInfo.id,
            existingRoleID,
            action,
            name: pendingRoleName,
            permissions: pendingRolePermissions,
          });
          popModal();
          return response;
        } catch (e) {
          throw e;
        }
      })(),
    );
  }, [
    callModifyCommunityRole,
    dispatchActionPromise,
    threadInfo,
    action,
    existingRoleID,
    pendingRoleName,
    pendingRolePermissions,
    popModal,
  ]);

  const saveButtonContent = React.useMemo(() => {
    if (createRolesLoadingStatus === 'loading') {
      return (
        <LoadingIndicator status={createRolesLoadingStatus} size="medium" />
      );
    }

    return createButtonText;
  }, [createRolesLoadingStatus, createButtonText]);

  return (
    <Modal name="Create Role" onClose={onCloseModal} size="large">
      <form method="POST" className={css.formContainer}>
        <div className={css.roleNameLabel}>Role Name</div>
        <div className={css.roleNameInput}>
          <Input
            type="text"
            value={pendingRoleName}
            onChange={onChangeRoleName}
          />
        </div>
        <div className={errorMessageClassNames}>
          There is already a role with this name in the community
        </div>
      </form>
      <hr className={css.separator} />
      <div className={css.permissionsHeaderContainer}>
        <div className={css.permissionsLabel}>Permissions</div>
        <div
          className={clearPermissionsClassNames}
          onClick={onClearPermissions}
        >
          Clear Permissions
        </div>
      </div>
      <div className={css.permissionsContainer}>{permissionsList}</div>
      <div className={css.buttonsContainer}>
        <Button
          variant="outline"
          className={css.backButton}
          buttonColor={buttonThemes.outline}
          onClick={onCloseModal}
        >
          Back
        </Button>
        <Button
          variant="filled"
          className={css.createRoleButton}
          buttonColor={buttonThemes.standard}
          onClick={onClickCreateRole}
        >
          {saveButtonContent}
        </Button>
      </div>
    </Modal>
  );
}

export default CreateRolesModal;
