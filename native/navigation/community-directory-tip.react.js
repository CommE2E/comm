// @flow

import * as React from 'react';

import CommunityDrawerButtonIcon from './community-drawer-button-icon.react.js';
import {
  type NUXTipsOverlayProps,
  createNUXTipsOverlay,
} from '../tooltip/nux-tips-overlay.react.js';

const communityDrawerText =
  'If you’d like to join more communities at any point, just open this view' +
  ' and press the “Explore communities” button.';

const CommunityDirectoryTip: React.ComponentType<
  NUXTipsOverlayProps<'CommunityDirectoryTip'>,
> = createNUXTipsOverlay(CommunityDrawerButtonIcon, communityDrawerText);

export default CommunityDirectoryTip;
