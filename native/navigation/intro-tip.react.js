// @flow

import * as React from 'react';

import {
  type NUXTipsOverlayProps,
  createNUXTipsOverlay,
} from '../tooltip/nux-tips-overlay.react.js';

const introTipText =
  'Chats on Comm are either DMs (which work like Signal) ' +
  'or channels inside of a community (which work like a federated Discord).';

const HomeTabTip: React.ComponentType<NUXTipsOverlayProps<'IntroTip'>> =
  createNUXTipsOverlay(undefined, introTipText);

export default HomeTabTip;
