// @flow

import { StyleSheet } from 'react-native';

import type { MediaInfo } from 'lib/types/media-types';

import { createTooltip, tooltipHeight } from '../components/tooltip2.react';

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

const spec = {
  entries: [
    { text: "Save", onPress: onPressSave },
  ],
  labelStyle: styles.popoverLabelStyle,
};

const MultimediaTooltipModal = createTooltip(MultimediaTooltipButton, spec);

const multimediaTooltipHeight = tooltipHeight(spec.entries.length);

export {
  MultimediaTooltipModal,
  multimediaTooltipHeight,
};
