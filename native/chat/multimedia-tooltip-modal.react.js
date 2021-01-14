// @flow

import invariant from 'invariant';

import { createPendingSidebar } from 'lib/shared/thread-utils';
import type { MediaInfo } from 'lib/types/media-types';
import type {
  DispatchFunctions,
  ActionFunc,
  BoundServerCall,
} from 'lib/utils/action-utils';

import type { InputState } from '../input/input-state';
import { intentionalSaveMedia } from '../media/save-media';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import { MessageListRouteName } from '../navigation/route-names';
import {
  createTooltip,
  tooltipHeight,
  type TooltipParams,
  type TooltipRoute,
} from '../navigation/tooltip.react';
import type { ChatMultimediaMessageInfoItem } from './multimedia-message.react';
import MultimediaTooltipButton from './multimedia-tooltip-button.react';

export type MultimediaTooltipModalParams = TooltipParams<{|
  +item: ChatMultimediaMessageInfoItem,
  +mediaInfo: MediaInfo,
  +verticalOffset: number,
|}>;

function onPressSave(route: TooltipRoute<'MultimediaTooltipModal'>) {
  const { mediaInfo, item } = route.params;
  const { id: uploadID, uri } = mediaInfo;
  const { id: messageServerID, localID: messageLocalID } = item.messageInfo;
  const ids = { uploadID, messageServerID, messageLocalID };
  return intentionalSaveMedia(uri, ids);
}

function onPressCreateSidebar(
  route: TooltipRoute<'MultimediaTooltipModal'>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: (serverCall: ActionFunc) => BoundServerCall,
  inputState: ?InputState,
  navigation: AppNavigationProp<'MultimediaTooltipModal'>,
  viewerID: ?string,
) {
  invariant(
    viewerID,
    'viewerID should be set in MultimediaTooltipModal.onPressCreateSidebar',
  );
  const { messageInfo, threadInfo } = route.params.item;
  const pendingSidebarInfo = createPendingSidebar(
    messageInfo,
    threadInfo,
    viewerID,
  );
  const initialMessageID = messageInfo.id;

  navigation.navigate({
    name: MessageListRouteName,
    params: {
      threadInfo: pendingSidebarInfo,
      sidebarSourceMessageID: initialMessageID,
    },
    key: `${MessageListRouteName}${pendingSidebarInfo.id}`,
  });
}

const spec = {
  entries: [
    { id: 'save', text: 'Save', onPress: onPressSave },
    { id: 'sidebar', text: 'Create sidebar', onPress: onPressCreateSidebar },
  ],
};

const MultimediaTooltipModal = createTooltip<'MultimediaTooltipModal'>(
  MultimediaTooltipButton,
  spec,
);

const multimediaTooltipHeight = tooltipHeight(spec.entries.length);

export { MultimediaTooltipModal, multimediaTooltipHeight };
