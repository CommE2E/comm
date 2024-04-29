// @flow

import * as React from 'react';

import type { TagFarcasterChannelNavigationProp } from './tag-farcaster-channel-navigator.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';

export type TagFarcasterChannelByNameParams = {
  +communityID: string,
};

type Props = {
  +navigation: TagFarcasterChannelNavigationProp<'TagFarcasterChannelByName'>,
  +route: NavigationRoute<'TagFarcasterChannelByName'>,
};

// eslint-disable-next-line no-unused-vars
function TagFarcasterChannelByName(prop: Props): React.Node {
  return null;
}

export default TagFarcasterChannelByName;
