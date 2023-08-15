// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditThreadAvatarContext } from 'lib/components/base-edit-thread-avatar-provider.react.js';
import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types.js';

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

  return (
    <div className={css.editThreadAvatarContainer}>
      <ThreadAvatar
        threadInfo={threadInfo}
        size="profile"
        showSpinner={threadAvatarSaveInProgress}
      />
    </div>
  );
}

export default EditThreadAvatar;
