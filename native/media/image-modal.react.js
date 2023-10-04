// @flow

import Clipboard from '@react-native-clipboard/clipboard';
import invariant from 'invariant';
import * as React from 'react';

import { type MediaInfo } from 'lib/types/media-types.js';

import Multimedia from './multimedia.react.js';
import { useIntentionalSaveMedia } from './save-media.js';
import FullScreenViewModal from '../components/full-screen-view-modal.react.js';
import { displayActionResultModal } from '../navigation/action-result-modal.js';
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
  const { mediaInfo, item } = route.params;

  const intentionalSaveMedia = useIntentionalSaveMedia();

  const onPressSave = React.useCallback(() => {
    invariant(
      mediaInfo.type === 'photo' || mediaInfo.type === 'video',
      'saving media of type ' + mediaInfo.type + ' is not supported',
    );

    const { id: uploadID, uri } = mediaInfo;
    const { id: messageServerID, localID: messageLocalID } = item.messageInfo;
    const ids = { uploadID, messageServerID, messageLocalID };
    return intentionalSaveMedia(uri, ids);
  }, [intentionalSaveMedia, item.messageInfo, mediaInfo]);

  const onPressCopy = React.useCallback(() => {
    const { uri } = mediaInfo;
    Clipboard.setImageFromURL(uri, success => {
      displayActionResultModal(success ? 'copied!' : 'failed to copy :(');
    });
  }, [mediaInfo]);

  return (
    <FullScreenViewModal
      navigation={navigation}
      route={route}
      saveContentCallback={onPressSave}
      copyContentCallback={onPressCopy}
    >
      <Multimedia mediaInfo={route.params.mediaInfo} spinnerColor="white" />
    </FullScreenViewModal>
  );
}

export default ImageModal;
