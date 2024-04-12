// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import type { TagFarcasterChannelNavigationProp } from './tag-farcaster-channel-navigator.react';
import type { NavigationRoute } from '../../navigation/route-names';

type Props = {
  +navigation: TagFarcasterChannelNavigationProp<'TagFarcasterChannel'>,
  +route: NavigationRoute<'TagFarcasterChannel'>,
};

// eslint-disable-next-line no-unused-vars
function TagFarcasterChannel(props: Props): React.Node {
  const tagFarcasterChannel = React.useMemo(
    () => (
      <View>
        <Text>Connect farcaster</Text>
      </View>
    ),
    [],
  );

  return tagFarcasterChannel;
}

export default TagFarcasterChannel;
