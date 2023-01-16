// @flow

import * as React from 'react';

import { ThreadListProvider } from '../chat/thread-list-provider';
import CommunityDrawerContent from './community-drawer-content.react';

function CommunityDrawer(): React.Node {
  return (
    <ThreadListProvider>
      <CommunityDrawerContent />
    </ThreadListProvider>
  );
}

export default CommunityDrawer;
