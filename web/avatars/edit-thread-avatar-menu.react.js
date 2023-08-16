// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditThreadAvatarContext } from 'lib/components/base-edit-thread-avatar-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types.js';

import css from './edit-avatar-menu.css';
import MenuItem from '../components/menu-item.react.js';
import Menu from '../components/menu.react.js';

const editIcon = (
  <div className={css.editAvatarBadge}>
    <SWMansionIcon icon="edit-2" size={20} />
  </div>
);

type Props = {
  +threadInfo: RawThreadInfo | ThreadInfo,
};
function EditThreadAvatarMenu(props: Props): React.Node {
  const { threadInfo } = props;

  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext should be set');

  const { baseSetThreadAvatar } = editThreadAvatarContext;

  const removeThreadAvatar = React.useCallback(
    () => baseSetThreadAvatar(threadInfo.id, { type: 'remove' }),
    [baseSetThreadAvatar, threadInfo.id],
  );

  const removeMenuItem = React.useMemo(
    () => (
      <MenuItem
        key="remove"
        text="Reset to default"
        icon="trash-2"
        onClick={removeThreadAvatar}
      />
    ),
    [removeThreadAvatar],
  );

  const menuItems = React.useMemo(() => [removeMenuItem], [removeMenuItem]);

  return (
    <div>
      <Menu icon={editIcon}>{menuItems}</Menu>
    </div>
  );
}

export default EditThreadAvatarMenu;
