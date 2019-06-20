// @flow

import type { MediaInfo } from 'lib/types/media-types';

import { createTooltip } from '../components/tooltip2.react';

import MultimediaTooltipButton from './multimedia-tooltip-button.react';
import { saveImage } from '../media/save-image';

type CustomProps = {
  mediaInfo: MediaInfo,
};

function onPressSave(props: CustomProps) {
  return saveImage(props.mediaInfo);
}

const MultimediaTooltipModal = createTooltip(
  MultimediaTooltipButton,
  [
    { text: "Save", onPress: onPressSave }
  ],
);

export default MultimediaTooltipModal;
