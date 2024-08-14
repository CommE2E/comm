// @flow

import * as React from 'react';

import ChatTabBarButton from '../chat/chat-tab-bar-button.react.js';
import { backgroundChatThreadListOptions } from '../chat/chat.react.js';
import {
  type NUXTipsOverlayProps,
  createNUXTipsOverlay,
} from '../tooltip/nux-tips-overlay.react.js';

const communityDrawerText =
  'You can use this view to explore the tree of channels ' +
  'inside a community. This shows you all of the channels you can see, ' +
  "including ones you haven't joined.";

function WrappedChatTabBarButton(): React.Node {
  const { title, tabBarIcon } = backgroundChatThreadListOptions;
  return <ChatTabBarButton title={title} tabBarIcon={tabBarIcon} />;
}

const MutedTabTip: React.ComponentType<NUXTipsOverlayProps<'MutedTabTip'>> =
  createNUXTipsOverlay(WrappedChatTabBarButton, communityDrawerText);

export default MutedTabTip;
