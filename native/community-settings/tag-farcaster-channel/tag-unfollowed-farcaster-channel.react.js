// @flow

import * as React from 'react';

import type { TagFarcasterChannelNavigationProp } from './tag-farcaster-channel-navigator.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';

export type TagUnfollowedFarcasterChannelParams = {
  +communityID: string,
};

type Props = {
  +navigation: TagFarcasterChannelNavigationProp<'TagUnfollowedFarcasterChannel'>,
  +route: NavigationRoute<'TagUnfollowedFarcasterChannel'>,
};

// eslint-disable-next-line no-unused-vars
function TagUnfollowedFarcasterChannel(prop: Props): React.Node {
  return null;
}

export default TagUnfollowedFarcasterChannel;
