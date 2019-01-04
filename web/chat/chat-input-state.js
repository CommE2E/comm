// @flow

import {
  type PendingMultimediaUpload,
  pendingMultimediaUploadPropType,
} from 'lib/types/media-types';

import PropTypes from 'prop-types';

export type ChatInputState = {|
  pendingUploads: {[localID: string]: PendingMultimediaUpload},
  draft: string,
  appendFiles: (files: $ReadOnlyArray<File>) => Promise<void>,
  removePendingUpload: (localID: string) => void,
  clearPendingUploads: () => void,
  setDraft: (draft: string) => void,
  setProgress: (localID: string, percent: number) => void,
|};
export const chatInputStatePropType = PropTypes.shape({
  pendingUploads:
    PropTypes.objectOf(pendingMultimediaUploadPropType).isRequired,
  draft: PropTypes.string.isRequired,
  appendFiles: PropTypes.func.isRequired,
  removePendingUpload: PropTypes.func.isRequired,
  clearPendingUploads: PropTypes.func.isRequired,
  setDraft: PropTypes.func.isRequired,
  setProgress: PropTypes.func.isRequired,
});
