// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditThreadAvatarContext } from 'lib/components/base-edit-thread-avatar-provider.react.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { getCommunity } from 'lib/shared/thread-utils.js';
import type { CommunityInfo } from 'lib/types/community-types.js';
import type {
  ThreadInfo,
  RawThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypeIsThick } from 'lib/types/thread-types-enum.js';

import { useUploadAvatarMedia } from './avatar-hooks.react.js';
import css from './edit-avatar-menu.css';
import ThreadEmojiAvatarSelectionModal from './thread-emoji-avatar-selection-modal.react.js';
import CommIcon from '../comm-icon.react.js';
import MenuItem from '../components/menu-item.react.js';
import Menu from '../components/menu.react.js';
import { allowedMimeTypeString } from '../media/file-utils.js';
import { useSelector } from '../redux/redux-utils.js';

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

  const communityID = getCommunity(threadInfo);
  const communityInfo: ?CommunityInfo = useSelector(state => {
    if (!communityID) {
      return null;
    }
    return state.communityStore.communityInfos[communityID];
  });

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

  const imageInputRef = React.useRef<?HTMLInputElement>();
  const onImageMenuItemClicked = React.useCallback(
    () => imageInputRef.current?.click(),
    [],
  );

  const uploadAvatarMedia = useUploadAvatarMedia({
    uploadMetadataToKeyserver: !threadTypeIsThick(threadInfo.type),
  });
  const onImageSelected = React.useCallback(
    async (event: SyntheticEvent<HTMLInputElement>) => {
      const { target } = event;
      invariant(target instanceof HTMLInputElement, 'target not input');
      const uploadResult = await uploadAvatarMedia(target.files[0]);
      await baseSetThreadAvatar(threadInfo.id, uploadResult);
    },
    [baseSetThreadAvatar, threadInfo.id, uploadAvatarMedia],
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

  const { pushModal } = useModalContext();
  const openEmojiSelectionModal = React.useCallback(
    () =>
      pushModal(<ThreadEmojiAvatarSelectionModal threadInfo={threadInfo} />),
    [pushModal, threadInfo],
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

  const setFarcasterThreadAvatar = React.useCallback(
    () => baseSetThreadAvatar(threadInfo.id, { type: 'farcaster' }),
    [baseSetThreadAvatar, threadInfo.id],
  );

  const farcasterIcon = React.useMemo(
    () => <CommIcon icon="farcaster-outline" size={22} />,
    [],
  );

  const farcasterMenuItem = React.useMemo(
    () => (
      <MenuItem
        key="farcaster"
        text="Use Farcaster avatar"
        onClick={setFarcasterThreadAvatar}
        iconComponent={farcasterIcon}
      />
    ),
    [farcasterIcon, setFarcasterThreadAvatar],
  );

  const menuItems = React.useMemo(() => {
    const items = [emojiMenuItem, imageMenuItem];
    if (communityInfo?.farcasterChannelID) {
      items.push(farcasterMenuItem);
    }
    if (threadInfo.avatar) {
      items.push(removeMenuItem);
    }
    return items;
  }, [
    communityInfo?.farcasterChannelID,
    emojiMenuItem,
    farcasterMenuItem,
    imageMenuItem,
    removeMenuItem,
    threadInfo.avatar,
  ]);

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

export default EditThreadAvatarMenu;
