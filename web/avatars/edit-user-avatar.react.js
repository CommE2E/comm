// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditUserAvatarContext } from 'lib/components/edit-user-avatar-provider.react.js';

import EditUserAvatarMenu from './edit-user-avatar-menu.react.js';
import css from './edit-user-avatar.css';
import UserAvatar from './user-avatar.react.js';

type Props = {
  +userID: ?string,
  +disabled?: boolean,
};
function EditUserAvatar(props: Props): React.Node {
  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');

  const { userAvatarSaveInProgress } = editUserAvatarContext;

  const { userID } = props;

  return (
    <div className={css.editUserAvatarContainer}>
      <UserAvatar
        userID={userID}
        size="profile"
        showSpinner={userAvatarSaveInProgress}
      />
      {!userAvatarSaveInProgress ? <EditUserAvatarMenu /> : null}
    </div>
  );
}

export default EditUserAvatar;
