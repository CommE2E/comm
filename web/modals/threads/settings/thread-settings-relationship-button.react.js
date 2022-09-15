// @flow
import {
  faUserMinus,
  faUserPlus,
  faUserShield,
  faUserSlash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
import css from './thread-settings-relationship-tab.css';

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

  const icon = React.useMemo(() => {
    let buttonIcon = null;

    if (relationshipButton === relationshipButtons.FRIEND) {
      buttonIcon = faUserPlus;
    } else if (relationshipButton === relationshipButtons.UNFRIEND) {
      buttonIcon = faUserMinus;
    } else if (relationshipButton === relationshipButtons.BLOCK) {
      buttonIcon = faUserShield;
    } else if (relationshipButton === relationshipButtons.UNBLOCK) {
      buttonIcon = faUserShield;
    } else if (relationshipButton === relationshipButtons.ACCEPT) {
      buttonIcon = faUserPlus;
    } else if (relationshipButton === relationshipButtons.REJECT) {
      buttonIcon = faUserSlash;
    } else if (relationshipButton === relationshipButtons.WITHDRAW) {
      buttonIcon = faUserMinus;
    }

    if (buttonIcon) {
      return (
        <FontAwesomeIcon
          icon={buttonIcon}
          className={css.relationshipButtonIcon}
        />
      );
    }
  }, [relationshipButton]);

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
      <div className={css.relationshipButtonContent}>
        {icon}
        <div className={css.relationshipButtonText}>{text}</div>
      </div>
    </Button>
  );
}

export default ThreadSettingsRelationshipButton;
