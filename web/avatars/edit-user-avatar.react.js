// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditUserAvatarContext } from 'lib/components/base-edit-user-avatar-provider.react.js';

import EditUserAvatarMenu from './edit-user-avatar-menu.react.js';
import css from './edit-user-avatar.css';
import UserAvatar from './user-avatar.react.js';
import LoadingIndicator from '../loading-indicator.react.js';

type Props = {
  +userID: ?string,
  +disabled?: boolean,
};
function EditUserAvatar(props: Props): React.Node {
  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');

  const { userAvatarSaveInProgress } = editUserAvatarContext;

  const { userID } = props;

  const loadingSpinner = React.useMemo(
    () => <LoadingIndicator status="loading" size="large" />,
    [],
  );

  return (
    <div className={css.editUserAvatarContainer}>
      <div className={css.editAvatarLoadingSpinner}>
        {userAvatarSaveInProgress ? loadingSpinner : undefined}
      </div>
      <UserAvatar userID={userID} size="profile" />
      <div className={css.editAvatarBadge}>
        <EditUserAvatarMenu />
      </div>
    </div>
  );
}

export default EditUserAvatar;
