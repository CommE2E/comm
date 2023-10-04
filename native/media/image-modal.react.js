// @flow

import * as React from 'react';

import { type MediaInfo } from 'lib/types/media-types.js';

import FullScreenViewModal from '../components/full-screen-view-modal.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import type { ChatMultimediaMessageInfoItem } from '../types/chat-types.js';
import {
  type VerticalBounds,
  type LayoutCoordinates,
} from '../types/layout-types.js';

export type ImageModalParams = {
  +presentedFrom: string,
  +mediaInfo: MediaInfo,
  +initialCoordinates: LayoutCoordinates,
  +verticalBounds: VerticalBounds,
  +item: ChatMultimediaMessageInfoItem,
};

type Props = {
  +navigation: AppNavigationProp<'ImageModal'>,
  +route: NavigationRoute<'ImageModal'>,
};

function ImageModal(props: Props): React.Node {
  const { navigation, route } = props;

  return <FullScreenViewModal navigation={navigation} route={route} />;
}

export default ImageModal;
