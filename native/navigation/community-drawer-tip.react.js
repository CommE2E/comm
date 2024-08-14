// @flow

import * as React from 'react';

import CommunityDrawerButtonBase from './community-drawer-button-base.react.js';
import {
  type NUXTipsOverlayProps,
  createNUXTipsOverlay,
} from '../tooltip/nux-tips-overlay.react.js';

const communityDrawerText =
  'You can use this view to explore the tree of channels ' +
  'inside a community. This shows you all of the channels you can see, ' +
  "including ones you haven't joined.";

const CommunityDrawerTip: React.ComponentType<
  NUXTipsOverlayProps<'CommunityDrawerTip'>,
> = createNUXTipsOverlay(CommunityDrawerButtonBase, communityDrawerText);

export default CommunityDrawerTip;
