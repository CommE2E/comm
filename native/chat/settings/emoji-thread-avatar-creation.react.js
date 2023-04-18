// @flow

import * as React from 'react';

import { changeThreadSettingsActionTypes } from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { savedEmojiAvatarSelectorForThread } from 'lib/selectors/thread-selectors.js';

import EmojiAvatarCreation from '../../avatars/emoji-avatar-creation.react.js';
import type { ChatNavigationProp } from '../../chat/chat.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useSaveThreadAvatar } from '../../utils/avatar-utils.js';

const threadAvatarLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:avatar`,
);

export type EmojiThreadAvatarCreationParams = {
  +threadID: string,
  +containingThreadID?: ?string,
};

type Props = {
  +navigation: ChatNavigationProp<'EmojiThreadAvatarCreation'>,
  +route: NavigationRoute<'EmojiThreadAvatarCreation'>,
};

function EmojiThreadAvatarCreation(props: Props): React.Node {
  const { threadID, containingThreadID } = props.route.params;

  const selector = savedEmojiAvatarSelectorForThread(
    threadID,
    containingThreadID,
  );

  const saveThreadAvatar = useSaveThreadAvatar();
  const saveThreadAvatarCallLoading = useSelector(
    state => threadAvatarLoadingStatusSelector(state) === 'loading',
  );

  const saveThreadAvatarCallback = React.useCallback(
    newAvatarRequest => saveThreadAvatar(newAvatarRequest, threadID),
    [saveThreadAvatar, threadID],
  );

  return (
    <EmojiAvatarCreation
      saveAvatarCall={saveThreadAvatarCallback}
      saveAvatarCallLoading={saveThreadAvatarCallLoading}
      savedEmojiAvatarSelector={selector}
    />
  );
}

export default EmojiThreadAvatarCreation;
