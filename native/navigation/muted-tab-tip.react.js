// @flow

import * as React from 'react';

import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';

import { createChatTabBarButton } from './chat-tab-bar-button.react.js';
import { backgroundChatThreadListOptions } from '../chat/chat-options.js';
import {
  type NUXTipsOverlayProps,
  createNUXTipsOverlay,
} from '../tooltip/nux-tips-overlay.react.js';

const mutedTabTipTextBase =
  'When you mute a chat, it automatically gets moved to this tab.';
const mutedTabTipTextIfFID =
  ' When Comm automatically adds you to a community associated with a ' +
  'Farcaster channel you follow, we mute them by default.';

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
  > = createNUXTipsOverlay(
    createChatTabBarButton<'MutedTabTip'>(backgroundChatThreadListOptions),
    text,
  );

  return <MutedTabTipComponent {...props} />;
}

export default MutedTabTip;
