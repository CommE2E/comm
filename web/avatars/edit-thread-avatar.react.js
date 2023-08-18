// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditThreadAvatarContext } from 'lib/components/base-edit-thread-avatar-provider.react.js';
import { threadHasPermission } from 'lib/shared/thread-utils.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types.js';

import EditThreadAvatarMenu from './edit-thread-avatar-menu.react.js';
import css from './edit-thread-avatar.css';
import ThreadAvatar from './thread-avatar.react.js';

type Props = {
  +threadInfo: RawThreadInfo | ThreadInfo,
  +disabled?: boolean,
};
function EditThreadAvatar(props: Props): React.Node {
  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext should be set');

  const { threadAvatarSaveInProgress } = editThreadAvatarContext;

  const { threadInfo } = props;
  const canEditThreadAvatar = threadHasPermission(
    threadInfo,
    threadPermissions.EDIT_THREAD_AVATAR,
  );

  let editThreadAvatarMenu;
  if (canEditThreadAvatar && !threadAvatarSaveInProgress) {
    editThreadAvatarMenu = <EditThreadAvatarMenu threadInfo={threadInfo} />;
  }

  return (
    <div className={css.editThreadAvatarContainer}>
      <ThreadAvatar
        threadInfo={threadInfo}
        size="profile"
        showSpinner={threadAvatarSaveInProgress}
      />
      {editThreadAvatarMenu}
    </div>
  );
}

export default EditThreadAvatar;
