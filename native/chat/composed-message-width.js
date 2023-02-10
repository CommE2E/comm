// @flow

import { useSelector } from '../redux/redux-utils.js';

function useMessageListScreenWidth(): number {
  return useSelector(state => {
    const { dimensions } = state;
    return dimensions.rotated ? dimensions.height : dimensions.width;
  });
}

// Keep sorta synced with styles.alignment/styles.messageBox in ComposedMessage
function useComposedMessageMaxWidth(): number {
  const messageListScreenWidth = useMessageListScreenWidth();
  return (messageListScreenWidth - 24) * 0.8;
}

export { useMessageListScreenWidth, useComposedMessageMaxWidth };
