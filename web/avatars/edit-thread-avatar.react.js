// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditThreadAvatarContext } from 'lib/components/base-edit-thread-avatar-provider.react.js';
import { useThreadHasPermission } from 'lib/shared/thread-utils.js';
import { threadSpecs } from 'lib/shared/threads/thread-specs.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';

import EditThreadAvatarMenu from './edit-thread-avatar-menu.react.js';
import css from './edit-thread-avatar.css';
import ThreadAvatar from './thread-avatar.react.js';

type Props = {
  +threadInfo: ThreadInfo,
  +disabled?: boolean,
};
function EditThreadAvatar(props: Props): React.Node {
  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext should be set');

  const { threadAvatarSaveInProgress } = editThreadAvatarContext;

  const { threadInfo } = props;
  const canEditThreadAvatar = useThreadHasPermission(
    threadInfo,
    threadPermissions.EDIT_THREAD_AVATAR,
  );
  const threadSupportAvatarEdit =
    threadSpecs[threadInfo.type].protocol().supportedThreadSettings.avatar;

  let editThreadAvatarMenu;
  if (
    canEditThreadAvatar &&
    !threadAvatarSaveInProgress &&
    threadSupportAvatarEdit
  ) {
    editThreadAvatarMenu = <EditThreadAvatarMenu threadInfo={threadInfo} />;
  }

  return (
    <div className={css.editThreadAvatarContainer}>
      <ThreadAvatar
        threadInfo={threadInfo}
        size="XL"
        showSpinner={threadAvatarSaveInProgress}
      />
      {editThreadAvatarMenu}
    </div>
  );
}

export default EditThreadAvatar;
