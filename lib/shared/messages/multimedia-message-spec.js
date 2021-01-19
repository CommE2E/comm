// @flow

import type { MediaMessageData } from '../../types/message/media';
import type { MessageSpec } from './message-spec';

export const multimediaMessageSpec: MessageSpec<MediaMessageData> = Object.freeze(
  {
    messageContent(data) {
      const mediaIDs = data.media.map((media) => parseInt(media.id, 10));
      return JSON.stringify(mediaIDs);
    },
  },
);
