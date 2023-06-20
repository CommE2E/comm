// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditUserAvatarContext } from 'lib/components/base-edit-user-avatar-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import css from './edit-user-avatar-menu.css';
import MenuItem from '../components/menu-item.react.js';
import Menu from '../components/menu.react.js';

const editIcon = (
  <div className={css.editAvatarBadge}>
    <SWMansionIcon icon="edit-2" size={20} />
  </div>
);

function EditUserAvatarMenu(): React.Node {
  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');

  const { setUserAvatar } = editUserAvatarContext;

  const removeUserAvatar = React.useCallback(() => {
    setUserAvatar({ type: 'remove' });
  }, [setUserAvatar]);

  const emojiMenuItem = React.useMemo(
    () => <MenuItem key="emoji" text="Select emoji" icon="emote-smile" />,
    [],
  );
  const imageMenuItem = React.useMemo(
    () => <MenuItem key="image" text="Select image" icon="image-1" />,
    [],
  );
  const removeMenuItem = React.useMemo(
    () => (
      <MenuItem
        key="remove"
        text="Reset to default"
        icon="trash-2"
        onClick={removeUserAvatar}
      />
    ),
    [removeUserAvatar],
  );

  const menuItems = React.useMemo(
    () => [emojiMenuItem, imageMenuItem, removeMenuItem],
    [emojiMenuItem, imageMenuItem, removeMenuItem],
  );

  return <Menu icon={editIcon}>{menuItems}</Menu>;
}

export default EditUserAvatarMenu;
