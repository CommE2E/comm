// @flow

import { StyleSheet } from 'react-native';

import type { MediaInfo } from 'lib/types/media-types';

import { createTooltip } from '../components/tooltip2.react';

import MultimediaTooltipButton from './multimedia-tooltip-button.react';
import { saveImage } from '../media/save-image';

type CustomProps = {
  mediaInfo: MediaInfo,
  verticalOffset: number,
};

function onPressSave(props: CustomProps) {
  return saveImage(props.mediaInfo);
}

const styles = StyleSheet.create({
  popoverLabelStyle: {
    textAlign: 'center',
    color: '#444',
  },
});

const MultimediaTooltipModal = createTooltip(
  MultimediaTooltipButton,
  {
    entries: [
      { text: "Save", onPress: onPressSave },
    ],
    labelStyle: styles.popoverLabelStyle,
  },
);

export default MultimediaTooltipModal;
