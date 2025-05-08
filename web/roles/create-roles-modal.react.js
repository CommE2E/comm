// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import { modifyCommunityRoleActionTypes } from 'lib/actions/thread-action-types.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useModifyCommunityRole } from 'lib/hooks/thread-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import {
  type UserSurfacedPermission,
  type UserSurfacedPermissionOption,
  userSurfacedPermissionOptions,
} from 'lib/types/thread-permission-types.js';
import type { RoleModificationRequest } from 'lib/types/thread-types.js';
import { values } from 'lib/utils/objects.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import css from './create-roles-modal.css';
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
  +rolePermissions: $ReadOnlySet<UserSurfacedPermission>,
};

type RoleCreationErrorVariant = 'already_exists' | 'unknown_error';

function CreateRolesModal(props: CreateRolesModalProps): React.Node {
  const { pushModal, popModal } = useModalContext();
  const { threadInfo, action, existingRoleID, roleName, rolePermissions } =
    props;
  const modalName = action === 'create_role' ? 'Create role' : 'Edit role';

  const callModifyCommunityRole = useModifyCommunityRole();
  const dispatchActionPromise = useDispatchActionPromise();

  const createRolesLoadingStatus: LoadingStatus = useSelector(
    createRolesLoadingStatusSelector,
  );

  const [pendingRoleName, setPendingRoleName] =
    React.useState<string>(roleName);
  const [pendingRolePermissions, setPendingRolePermissions] =
    React.useState<$ReadOnlySet<UserSurfacedPermission>>(rolePermissions);

  const [roleCreationFailed, setRoleCreationFailed] =
    React.useState<?RoleCreationErrorVariant>();

  const createButtonText = action === 'create_role' ? 'Create' : 'Save';

  const onChangeRoleName = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      setRoleCreationFailed(null);
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
    [css.clearPermissionsDisabled]: pendingRolePermissions.size === 0,
    [css.clearPermissionsEnabled]: pendingRolePermissions.size > 0,
  });

  const onClearPermissions = React.useCallback(
    () => setPendingRolePermissions(new Set()),
    [],
  );

  const isUserSurfacedPermissionSelected = React.useCallback(
    (option: UserSurfacedPermissionOption) =>
      pendingRolePermissions.has(option.userSurfacedPermission),
    [pendingRolePermissions],
  );

  const onEnumValuePress = React.useCallback(
    (option: UserSurfacedPermissionOption) =>
      setPendingRolePermissions(currentPermissions => {
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

  const permissionsList = React.useMemo(
    () =>
      [...userSurfacedPermissionOptions].map(permission => (
        <EnumSettingsOption
          key={permission.userSurfacedPermission}
          selected={isUserSurfacedPermissionSelected(permission)}
          onSelect={() => onEnumValuePress(permission)}
          icon={null}
          title={permission.title}
          type="checkbox"
          statements={[{ statement: permission.description }]}
        />
      )),
    [isUserSurfacedPermissionSelected, onEnumValuePress],
  );

  const errorMessageClassNames = classNames({
    [css.errorMessage]: true,
    [css.errorMessageVisible]: !!roleCreationFailed,
  });

  const threadRoleNames = React.useMemo(
    () => values(threadInfo.roles).map(role => role.name),
    [threadInfo],
  );

  const onClickCreateRole = React.useCallback(() => {
    if (threadRoleNames.includes(pendingRoleName) && action === 'create_role') {
      setRoleCreationFailed('already_exists');
      return;
    }

    let callModifyCommunityRoleParams: RoleModificationRequest;
    if (action === 'create_role') {
      callModifyCommunityRoleParams = {
        community: threadInfo.id,
        action,
        name: pendingRoleName,
        permissions: [...pendingRolePermissions],
      };
    } else {
      invariant(existingRoleID, 'existingRoleID should be defined');
      callModifyCommunityRoleParams = {
        community: threadInfo.id,
        existingRoleID,
        action,
        name: pendingRoleName,
        permissions: [...pendingRolePermissions],
      };
    }

    void dispatchActionPromise(
      modifyCommunityRoleActionTypes,
      (async () => {
        try {
          const response = await callModifyCommunityRole(
            callModifyCommunityRoleParams,
          );
          popModal();
          return response;
        } catch (e) {
          setRoleCreationFailed('unknown_error');
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
    threadRoleNames,
  ]);

  const errorMessage = React.useMemo(() => {
    if (roleCreationFailed === 'already_exists') {
      return 'There is already a role with this name in the community';
    } else {
      return 'An unknown error occurred. Please try again';
    }
  }, [roleCreationFailed]);

  const saveButtonContent = React.useMemo(() => {
    if (createRolesLoadingStatus === 'loading') {
      return (
        <LoadingIndicator status={createRolesLoadingStatus} size="medium" />
      );
    }

    return createButtonText;
  }, [createRolesLoadingStatus, createButtonText]);

  const primaryButton = React.useMemo(
    () => (
      <Button
        variant="filled"
        className={css.createRoleButton}
        buttonColor={buttonThemes.standard}
        onClick={onClickCreateRole}
      >
        {saveButtonContent}
      </Button>
    ),
    [onClickCreateRole, saveButtonContent],
  );

  const secondaryButton = React.useMemo(
    () => (
      <Button
        variant="outline"
        className={css.backButton}
        buttonColor={buttonThemes.outline}
        onClick={onCloseModal}
      >
        Back
      </Button>
    ),
    [onCloseModal],
  );

  return (
    <Modal
      name={modalName}
      onClose={onCloseModal}
      size="large"
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    >
      <form method="POST" className={css.formContainer}>
        <div className={css.roleNameLabel}>Role name</div>
        <div className={css.roleNameInput}>
          <Input
            type="text"
            value={pendingRoleName}
            onChange={onChangeRoleName}
          />
        </div>
        <div className={errorMessageClassNames}>{errorMessage}</div>
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
    </Modal>
  );
}

export default CreateRolesModal;
