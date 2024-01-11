// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import AccountDeleteModal from './account-delete-modal.react.js';
import css from './danger-zone.css';
import Button, { buttonThemes } from '../components/button.react.js';

function DangerZone(): React.Node {
  const { pushModal } = useModalContext();
  const onDeleteAccountClick = React.useCallback(
    () => pushModal(<AccountDeleteModal />),
    [pushModal],
  );

  return (
    <div className={css.contentContainer}>
      <h5 className={css.subheading}>Delete account</h5>
      <Button
        onClick={onDeleteAccountClick}
        variant="filled"
        buttonColor={buttonThemes.danger}
        className={css.button}
      >
        Delete Account
      </Button>
      <div className={css.explanation}>
        <p>Your account will be permanently deleted.</p>
        <p>There is no way to reverse this.</p>
      </div>
    </div>
  );
}

export default DangerZone;
