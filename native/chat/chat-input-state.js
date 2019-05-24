// @flow

import type { Dimensions } from 'lib/types/media-types';
import type { GalleryImageInfo } from '../media/image-gallery-image.react';

import * as React from 'react';

export type PendingMultimediaUpload = {|
  failed: ?string,
  progressPercent: number,
|};

export type PendingMultimediaUploads = {
  [localMessageID: string]: {
    [localUploadID: string]: PendingMultimediaUpload,
  },
};

export type ChatInputState = {|
  pendingUploads: PendingMultimediaUploads,
  sendMultimediaMessage: (
    threadID: string,
    imageInfos: $ReadOnlyArray<GalleryImageInfo>,
  ) => Promise<void>,
  messageHasUploadFailure: (localMessageID: string) => bool,
  retryMultimediaMessage: (localMessageID: string) => Promise<void>,
|};

const ChatInputStateContext = React.createContext<?ChatInputState>(null);

export {
  ChatInputStateContext,
};
