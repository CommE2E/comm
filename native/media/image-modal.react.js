// @flow

import * as React from 'react';
import { Platform } from 'react-native';

import type { MediaInfo, Dimensions } from 'lib/types/media-types.js';

import Multimedia from './multimedia.react.js';
import {
  useIntentionalSaveMedia,
  type IntentionalSaveMediaIDs,
  copyMediaIOS,
} from './save-media.js';
import FullScreenViewModal from '../components/full-screen-view-modal.react.js';
import { displayActionResultModal } from '../navigation/action-result-modal.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { derivedDimensionsInfoSelector } from '../selectors/dimensions-selectors.js';
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
  +item?: ?ChatMultimediaMessageInfoItem,
};

type Props = {
  +navigation: AppNavigationProp<'ImageModal'>,
  +route: NavigationRoute<'ImageModal'>,
};

function ImageModal(props: Props): React.Node {
  const { navigation, route } = props;
  const { mediaInfo, item } = route.params;

  const dimensionsInfo = useSelector(derivedDimensionsInfoSelector);

  const intentionalSaveMedia = useIntentionalSaveMedia();

  const messageInfo = item?.messageInfo;
  const onPressSave = React.useCallback(() => {
    const uploadID = mediaInfo.id;
    let ids: ?IntentionalSaveMediaIDs;
    if (messageInfo) {
      const { id: messageServerID, localID: messageLocalID } = messageInfo;
      ids = { uploadID, messageServerID, messageLocalID };
    }
    return intentionalSaveMedia(mediaInfo, ids);
  }, [intentionalSaveMedia, messageInfo, mediaInfo]);

  const onPressCopyIOS = React.useCallback(async () => {
    const { success } = await copyMediaIOS(mediaInfo);
    displayActionResultModal(success ? 'copied!' : 'failed to copy :(');
  }, [mediaInfo]);
  const onPressCopy = Platform.OS === 'ios' ? onPressCopyIOS : undefined;

  const imageDimensions: Dimensions = React.useMemo(() => {
    const frame = {
      width: dimensionsInfo.width,
      height: dimensionsInfo.safeAreaHeight,
    };

    // Make space for the close button
    let { height: maxHeight, width: maxWidth } = frame;
    if (maxHeight > maxWidth) {
      maxHeight -= 100;
    } else {
      maxWidth -= 100;
    }

    const { dimensions } = mediaInfo;
    if (dimensions.height < maxHeight && dimensions.width < maxWidth) {
      return dimensions;
    }

    const heightRatio = maxHeight / dimensions.height;
    const widthRatio = maxWidth / dimensions.width;
    if (heightRatio < widthRatio) {
      return {
        height: maxHeight,
        width: dimensions.width * heightRatio,
      };
    } else {
      return {
        width: maxWidth,
        height: dimensions.height * widthRatio,
      };
    }
  }, [dimensionsInfo.safeAreaHeight, dimensionsInfo.width, mediaInfo]);

  const imageModal = React.useMemo(
    () => (
      <FullScreenViewModal
        navigation={navigation}
        route={route}
        contentDimensions={imageDimensions}
        saveContentCallback={onPressSave}
        copyContentCallback={onPressCopy}
      >
        <Multimedia mediaInfo={mediaInfo} spinnerColor="white" />
      </FullScreenViewModal>
    ),
    [imageDimensions, mediaInfo, navigation, onPressCopy, onPressSave, route],
  );

  return imageModal;
}

export default ImageModal;
