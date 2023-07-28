// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditUserAvatarContext } from 'lib/components/base-edit-user-avatar-provider.react.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import css from './edit-user-avatar-menu.css';
import EmojiAvatarSelectionModal from './emoji-avatar-selection-modal.react.js';
import MenuItem from '../components/menu-item.react.js';
import Menu from '../components/menu.react.js';
import { allowedMimeTypeString } from '../media/file-utils.js';

const editIcon = (
  <div className={css.editAvatarBadge}>
    <SWMansionIcon icon="edit-2" size={20} />
  </div>
);

function EditUserAvatarMenu(): React.Node {
  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');

  const { baseSetUserAvatar } = editUserAvatarContext;

  const removeUserAvatar = React.useCallback(
    () => baseSetUserAvatar({ type: 'remove' }),
    [baseSetUserAvatar],
  );

  const { pushModal } = useModalContext();

  const openEmojiSelectionModal = React.useCallback(
    () => pushModal(<EmojiAvatarSelectionModal />),
    [pushModal],
  );

  const emojiMenuItem = React.useMemo(
    () => (
      <MenuItem
        key="emoji"
        text="Select emoji"
        icon="emote-smile"
        onClick={openEmojiSelectionModal}
      />
    ),
    [openEmojiSelectionModal],
  );

  const imageInputRef = React.useRef();
  const onImageMenuItemClicked = React.useCallback(
    () => imageInputRef.current?.click(),
    [],
  );

  const onImageSelected = React.useCallback(
    event => console.log(event.target.files),
    [],
  );

  const imageMenuItem = React.useMemo(
    () => (
      <MenuItem
        key="image"
        text="Select image"
        icon="image-1"
        onClick={onImageMenuItemClicked}
      />
    ),
    [onImageMenuItemClicked],
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

  return (
    <div>
      <input
        type="file"
        onChange={onImageSelected}
        ref={imageInputRef}
        accept={allowedMimeTypeString}
      />
      <Menu icon={editIcon}>{menuItems}</Menu>
    </div>
  );
}

export default EditUserAvatarMenu;
