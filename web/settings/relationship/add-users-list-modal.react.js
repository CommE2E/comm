// @flow

import * as React from 'react';

import {
  updateRelationships,
  updateRelationshipsActionTypes,
} from 'lib/actions/relationship-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  UserRelationshipStatus,
  RelationshipAction,
} from 'lib/types/relationship-types.js';
import { useLegacyAshoatKeyserverCall } from 'lib/utils/action-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import css from './add-users-list.css';
import AddUsersList from './add-users-list.react.js';
import type { ButtonColor } from '../../components/button.react.js';
import Button from '../../components/button.react.js';
import LoadingIndicator from '../../loading-indicator.react.js';
import SearchModal from '../../modals/search-modal.react.js';
import { useSelector } from '../../redux/redux-utils.js';

const loadingStatusSelector = createLoadingStatusSelector(
  updateRelationshipsActionTypes,
);

type Props = {
  +name: string,
  +excludedStatuses: $ReadOnlySet<UserRelationshipStatus>,
  +confirmButtonContent: React.Node,
  +confirmButtonColor?: ButtonColor,
  +relationshipAction: RelationshipAction,
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

  const [pendingUsersToAdd, setPendingUsersToAdd] = React.useState<
    $ReadOnlySet<string>,
  >(new Set());

  const [errorMessage, setErrorMessage] = React.useState('');

  const addUsersListChildGenerator = React.useCallback(
    (searchText: string) => (
      <AddUsersList
        searchText={searchText}
        excludedStatuses={excludedStatuses}
        pendingUsersToAdd={pendingUsersToAdd}
        setPendingUsersToAdd={setPendingUsersToAdd}
        errorMessage={errorMessage}
      />
    ),
    [excludedStatuses, pendingUsersToAdd, errorMessage],
  );

  const callUpdateRelationships =
    useLegacyAshoatKeyserverCall(updateRelationships);

  const dispatchActionPromise = useDispatchActionPromise();

  const updateRelationshipsPromiseCreator = React.useCallback(async () => {
    try {
      setErrorMessage('');
      const result = await callUpdateRelationships({
        action: relationshipAction,
        userIDs: Array.from(pendingUsersToAdd),
      });
      popModal();
      return result;
    } catch (e) {
      setErrorMessage('unknown error');
      throw e;
    }
  }, [
    callUpdateRelationships,
    popModal,
    relationshipAction,
    pendingUsersToAdd,
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
