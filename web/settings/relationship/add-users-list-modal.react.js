// @flow

import * as React from 'react';

import {
  updateRelationships,
  updateRelationshipsActionTypes,
} from 'lib/actions/relationship-actions.js';
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
  +closeModal: () => void,
  +name: string,
  +excludedStatuses: $ReadOnlySet<UserRelationshipStatus>,
  +confirmButtonContent: React.Node,
  +confirmButtonColor?: ButtonColor,
  +relationshipAction: RelationshipAction,
};

function AddUsersListModal(props: Props): React.Node {
  const {
    closeModal,
    name,
    excludedStatuses,
    confirmButtonContent,
    confirmButtonColor,
    relationshipAction,
  } = props;

  const [errorMessage, setErrorMessage] = React.useState('');

  const addUsersListChildGenerator = React.useCallback(
    (searchText: string) => (
      <AddUsersList
        searchText={searchText}
        excludedStatuses={excludedStatuses}
        errorMessage={errorMessage}
      />
    ),
    [excludedStatuses, errorMessage],
  );

  const callUpdateRelationships =
    useLegacyAshoatKeyserverCall(updateRelationships);

  const dispatchActionPromise = useDispatchActionPromise();

  const updateRelationshipsPromiseCreator = React.useCallback(async () => {
    try {
      setErrorMessage('');
      const result = await callUpdateRelationships({
        action: relationshipAction,
        userIDs: [], // TODO: re-add pending users
      });
      closeModal();
      return result;
    } catch (e) {
      setErrorMessage('unknown error');
      throw e;
    }
  }, [callUpdateRelationships, closeModal, relationshipAction]);

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
        // TODO: re-add 0 users check
        disabled={true || loadingStatus === 'loading'}
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
  ]);

  return (
    <SearchModal
      name={name}
      onClose={closeModal}
      size="large"
      searchPlaceholder="Search by name"
      primaryButton={primaryButton}
    >
      {addUsersListChildGenerator}
    </SearchModal>
  );
}

export default AddUsersListModal;
