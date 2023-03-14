// @flow

import { avatarOffset } from './chat-constants.js';
import { useSelector } from '../redux/redux-utils.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';

function useMessageListScreenWidth(): number {
  return useSelector(state => {
    const { dimensions } = state;
    return dimensions.rotated ? dimensions.height : dimensions.width;
  });
}

// Keep sorta synced with styles.alignment/styles.messageBox in ComposedMessage
function useComposedMessageMaxWidth(): number {
  const messageListScreenWidth = useMessageListScreenWidth();
  const shouldRenderAvatars = useShouldRenderAvatars();

  if (shouldRenderAvatars) {
    return (messageListScreenWidth - 24 - avatarOffset) * 0.8;
  }

  return (messageListScreenWidth - 24) * 0.8;
}

export { useMessageListScreenWidth, useComposedMessageMaxWidth };
