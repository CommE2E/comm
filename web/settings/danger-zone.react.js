// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import AccountDeleteModal from './account-delete-modal.react.js';
import css from './danger-zone.css';
import Button, { buttonThemes } from '../components/button.react.js';

function DangerZone(): React.Node {
  const { pushModal } = useModalContext();
  const onDeleteAccountClick = React.useCallback(
    () => pushModal(<AccountDeleteModal />),
    [pushModal],
  );

  // Once we're using the identity service for auth, a user may only delete
  // their Comm account using their primary device. Their primary device cannot
  // be a web device at this time, so we hide the Danger Zone from web users.
  if (usingCommServicesAccessToken) {
    return null;
  }

  return (
    <div className={css.container}>
      <div className={css.contentContainer}>
        <h4 className={css.header}>Danger Zone</h4>
        <h5 className={css.subheading}>Delete Account</h5>
        <Button
          onClick={onDeleteAccountClick}
          variant="filled"
          buttonColor={buttonThemes.danger}
          className={css.button}
        >
          Delete Account
        </Button>
        <p className={css.explanation}>
          Your account will be permanently deleted. There is no way to reverse
          this.
        </p>
      </div>
    </div>
  );
}

export default DangerZone;
