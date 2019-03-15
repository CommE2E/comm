// @flow

import {
  type MediaType,
  mediaTypePropType,
  type Dimensions,
  dimensionsPropType,
} from 'lib/types/media-types';

import PropTypes from 'prop-types';

export type PendingMultimediaUpload = {|
  localID: string,
  // Pending uploads are assigned a serverID once they are complete
  serverID: ?string,
  // Pending uploads are assigned a messageID once they are sent. serverID and
  // messageID shouldn't both be set, as in that case the upload is no longer
  // pending and should be cleared out
  messageID: ?string,
  // This is set to truthy if the upload fails for whatever reason
  failed: ?string,
  file: File,
  mediaType: MediaType,
  dimensions: Dimensions,
  uri: string,
  // URLs created with createObjectURL aren't considered "real". The distinction
  // is required because those "fake" URLs must be disposed properly
  uriIsReal: bool,
  progressPercent: number,
  // This is set once the network request begins and used if the upload is
  // cancelled
  abort: ?(() => void),
|};
export const pendingMultimediaUploadPropType = PropTypes.shape({
  localID: PropTypes.string.isRequired,
  serverID: PropTypes.string,
  messageID: PropTypes.string,
  failed: PropTypes.string,
  file: PropTypes.object.isRequired,
  mediaType: mediaTypePropType.isRequired,
  dimensions: dimensionsPropType.isRequired,
  uri: PropTypes.string.isRequired,
  uriIsReal: PropTypes.bool.isRequired,
  progressPercent: PropTypes.number.isRequired,
  abort: PropTypes.func,
});

// This type represents the input state for a particular thread
export type ChatInputState = {|
  pendingUploads: $ReadOnlyArray<PendingMultimediaUpload>,
  assignedUploads:
    {[messageID: string]: $ReadOnlyArray<PendingMultimediaUpload>},
  draft: string,
  appendFiles: (files: $ReadOnlyArray<File>) => Promise<void>,
  cancelPendingUpload: (localUploadID: string) => void,
  assignPendingUploads: (localMessageID: string) => void,
  setDraft: (draft: string) => void,
  setProgress: (localUploadID: string, percent: number) => void,
  messageHasUploadFailure: (localMessageID: string) => bool,
  retryUploads: (localMessageID: string) => void,
|};
const arrayOfUploadsPropType =
  PropTypes.arrayOf(pendingMultimediaUploadPropType);
export const chatInputStatePropType = PropTypes.shape({
  pendingUploads: arrayOfUploadsPropType.isRequired,
  assignedUploads: PropTypes.objectOf(arrayOfUploadsPropType).isRequired,
  draft: PropTypes.string.isRequired,
  appendFiles: PropTypes.func.isRequired,
  cancelPendingUpload: PropTypes.func.isRequired,
  assignPendingUploads: PropTypes.func.isRequired,
  setDraft: PropTypes.func.isRequired,
  setProgress: PropTypes.func.isRequired,
  messageHasUploadFailure: PropTypes.func.isRequired,
  retryUploads: PropTypes.func.isRequired,
});
