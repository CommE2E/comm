// @flow

import * as React from 'react';

import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';

import ChatTabBarButton from '../chat/chat-tab-bar-button.react.js';
import { backgroundChatThreadListOptions } from '../chat/chat.react.js';
import {
  type NUXTipsOverlayProps,
  createNUXTipsOverlay,
} from '../tooltip/nux-tips-overlay.react.js';

const mutedTabTipTextBase =
  'When you mute a chat, it automatically gets moved to this tab.';
const mutedTabTipTextIfFID =
  ' When Comm automatically adds you to a community associated with a ' +
  'Farcaster channel you follow, we mute them by default.';

function WrappedChatTabBarButton(): React.Node {
  const { title, tabBarIcon } = backgroundChatThreadListOptions;
  return <ChatTabBarButton title={title} tabBarIcon={tabBarIcon} />;
}

function MutedTabTip(props: NUXTipsOverlayProps<'MutedTabTip'>): React.Node {
  const fid = useCurrentUserFID();
  const text = React.useMemo(() => {
    if (!fid) {
      return mutedTabTipTextBase;
    }
    return mutedTabTipTextBase + mutedTabTipTextIfFID;
  }, [fid]);

  const MutedTabTipComponent: React.ComponentType<
    NUXTipsOverlayProps<'MutedTabTip'>,
  > = createNUXTipsOverlay(WrappedChatTabBarButton, text);

  return <MutedTabTipComponent {...props} />;
}

export default MutedTabTip;
