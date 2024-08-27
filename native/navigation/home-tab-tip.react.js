// @flow

import * as React from 'react';

import { createChatTabBarButton } from './chat-tab-bar-button.react.js';
import { homeChatThreadListOptions } from '../chat/chat.react.js';
import {
  type NUXTipsOverlayProps,
  createNUXTipsOverlay,
} from '../tooltip/nux-tips-overlay.react.js';

const homeTabTipText =
  'Your home screen only shows the chats you’ve joined. ' +
  'When you join a community on Comm, you only join the root of the tree.';

const HomeTabTip: React.ComponentType<NUXTipsOverlayProps<'HomeTabTip'>> =
  createNUXTipsOverlay(
    createChatTabBarButton<'HomeTabTip'>(homeChatThreadListOptions),
    homeTabTipText,
  );

export default HomeTabTip;
