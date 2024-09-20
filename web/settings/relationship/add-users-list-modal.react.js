// @flow

import * as React from 'react';

import { updateRelationshipsActionTypes } from 'lib/actions/relationship-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useUpdateRelationships } from 'lib/hooks/relationship-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  UserRelationshipStatus,
  TraditionalRelationshipAction,
} from 'lib/types/relationship-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { useAddUsersListContext } from './add-users-list-provider.react.js';
import css from './add-users-list.css';
import AddUsersList from './add-users-list.react.js';
import { useUserRelationshipUserInfos } from './add-users-utils.js';
import type { ButtonColor } from '../../components/button.react.js';
import Button from '../../components/button.react.js';
import LoadingIndicator from '../../loading-indicator.react.js';
import SearchModal from '../../modals/search-modal.react.js';
import { useSelector } from '../../redux/redux-utils.js';

const loadingStatusSelector = createLoadingStatusSelector(
  updateRelationshipsActionTypes,
);

type AddUsersListModalContentProps = {
  +searchText: string,
  +excludedStatuses: $ReadOnlySet<UserRelationshipStatus>,
};

function AddUsersListModalContent(
  props: AddUsersListModalContentProps,
): React.Node {
  const { searchText, excludedStatuses } = props;

  const { mergedUserInfos, sortedUsersWithENSNames } =
    useUserRelationshipUserInfos({
      searchText,
      excludedStatuses,
    });

  const addUsersListModalContent = React.useMemo(
    () => (
      <AddUsersList
        searchModeActive={searchText.length > 0}
        userInfos={mergedUserInfos}
        sortedUsersWithENSNames={sortedUsersWithENSNames}
      />
    ),
    [mergedUserInfos, searchText.length, sortedUsersWithENSNames],
  );

  return addUsersListModalContent;
}

type Props = {
  +name: string,
  +excludedStatuses: $ReadOnlySet<UserRelationshipStatus>,
  +confirmButtonContent: React.Node,
  +confirmButtonColor?: ButtonColor,
  +relationshipAction: TraditionalRelationshipAction,
};

function AddUsersListModal(props: Props): React.Node {
  const {
    name,
    excludedStatuses,
    confirmButtonContent,
    confirmButtonColor,
    relationshipAction,
  } = props;

  const { popModal } = useModalContext();

  const { pendingUsersToAdd, setErrorMessage } = useAddUsersListContext();

  const addUsersListChildGenerator = React.useCallback(
    (searchText: string) => (
      <AddUsersListModalContent
        searchText={searchText}
        excludedStatuses={excludedStatuses}
      />
    ),
    [excludedStatuses],
  );

  const updateRelationships = useUpdateRelationships();

  const dispatchActionPromise = useDispatchActionPromise();

  const updateRelationshipsPromiseCreator = React.useCallback(async () => {
    try {
      setErrorMessage('');
      const result = await updateRelationships(
        relationshipAction,
        Array.from(pendingUsersToAdd.keys()),
      );
      popModal();
      return result;
    } catch (e) {
      setErrorMessage('unknown error');
      throw e;
    }
  }, [
    setErrorMessage,
    updateRelationships,
    relationshipAction,
    pendingUsersToAdd,
    popModal,
  ]);

  const confirmSelection = React.useCallback(
    () =>
      dispatchActionPromise(
        updateRelationshipsActionTypes,
        updateRelationshipsPromiseCreator(),
      ),
    [dispatchActionPromise, updateRelationshipsPromiseCreator],
  );

  const loadingStatus = useSelector(loadingStatusSelector);

  const primaryButton = React.useMemo(() => {
    let buttonContent = confirmButtonContent;

    if (loadingStatus === 'loading') {
      buttonContent = (
        <>
          <div className={css.hidden}>{confirmButtonContent}</div>
          <LoadingIndicator status="loading" />
        </>
      );
    }

    return (
      <Button
        onClick={confirmSelection}
        disabled={pendingUsersToAdd.size === 0 || loadingStatus === 'loading'}
        variant="filled"
        buttonColor={confirmButtonColor}
      >
        <div className={css.confirmButtonContainer}>{buttonContent}</div>
      </Button>
    );
  }, [
    confirmButtonColor,
    confirmButtonContent,
    confirmSelection,
    loadingStatus,
    pendingUsersToAdd.size,
  ]);

  return (
    <SearchModal
      name={name}
      onClose={popModal}
      size="large"
      searchPlaceholder="Search by name"
      primaryButton={primaryButton}
    >
      {addUsersListChildGenerator}
    </SearchModal>
  );
}

export default AddUsersListModal;
