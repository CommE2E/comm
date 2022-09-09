// @flow
import invariant from 'invariant';
import * as React from 'react';

import {
  updateRelationships,
  updateRelationshipsActionTypes,
} from 'lib/actions/relationship-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  getRelationshipActionText,
  getRelationshipDispatchAction,
} from 'lib/shared/relationship-utils';
import type { SetState } from 'lib/types/hook-types';
import {
  relationshipButtons,
  type RelationshipButton,
} from 'lib/types/relationship-types';
import type { UserInfo } from 'lib/types/user-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Button from '../../../components/button.react';
import { useSelector } from '../../../redux/redux-utils';

const loadingStatusSelector = createLoadingStatusSelector(
  updateRelationshipsActionTypes,
);

type ButtonProps = {
  +relationshipButton: RelationshipButton,
  +otherUserInfo: UserInfo,
  +setErrorMessage?: SetState<string>,
};

function ThreadSettingsRelationshipButton(props: ButtonProps): React.Node {
  const { relationshipButton, otherUserInfo, setErrorMessage } = props;

  const disabled = useSelector(loadingStatusSelector) === 'loading';

  const { username } = otherUserInfo;
  invariant(username, 'Other username should be specified');

  let variant = 'primary';
  if (relationshipButton === relationshipButtons.FRIEND) {
    variant = 'success';
  } else if (relationshipButton === relationshipButtons.UNFRIEND) {
    variant = 'danger';
  } else if (relationshipButton === relationshipButtons.BLOCK) {
    variant = 'danger';
  } else if (relationshipButton === relationshipButtons.UNBLOCK) {
    variant = 'success';
  } else if (relationshipButton === relationshipButtons.ACCEPT) {
    variant = 'success';
  } else if (relationshipButton === relationshipButtons.REJECT) {
    variant = 'danger';
  } else if (relationshipButton === relationshipButtons.WITHDRAW) {
    variant = 'danger';
  }

  const { text, action } = React.useMemo(() => {
    return {
      text: getRelationshipActionText(relationshipButton, username),
      action: getRelationshipDispatchAction(relationshipButton),
    };
  }, [relationshipButton, username]);

  const dispatchActionPromise = useDispatchActionPromise();
  const callUpdateRelationships = useServerCall(updateRelationships);

  const updateRelationshipsActionPromise = React.useCallback(async () => {
    try {
      setErrorMessage?.('');
      return await callUpdateRelationships({
        action,
        userIDs: [otherUserInfo.id],
      });
    } catch (e) {
      setErrorMessage?.('Error updating relationship');
      throw e;
    }
  }, [action, callUpdateRelationships, otherUserInfo.id, setErrorMessage]);
  const onClick = React.useCallback(() => {
    dispatchActionPromise(
      updateRelationshipsActionTypes,
      updateRelationshipsActionPromise(),
    );
  }, [dispatchActionPromise, updateRelationshipsActionPromise]);

  return (
    <Button variant={variant} onClick={onClick} disabled={disabled}>
      {text}
    </Button>
  );
}

export default ThreadSettingsRelationshipButton;
