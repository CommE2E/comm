// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type { ThreadInfo } from 'lib/types/thread-types';

import type { NavigationRoute } from '../navigation/route-names';
import type { ChatNavigationProp } from './chat.react';

export type FullScreenThreadMediaGalleryParams = {
  +threadInfo: ThreadInfo,
};

type FullScreenThreadMediaGalleryProps = {
  +navigation: ChatNavigationProp<'FullScreenThreadMediaGallery'>,
  +route: NavigationRoute<'FullScreenThreadMediaGallery'>,
};

function FullScreenThreadMediaGallery(
  props: FullScreenThreadMediaGalleryProps,
): React.Node {
  const { id } = props.route.params.threadInfo;
  return <Text>{id}</Text>;
}

export default FullScreenThreadMediaGallery;
