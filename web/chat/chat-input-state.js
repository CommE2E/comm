// @flow

import {
  type PendingMultimediaUpload,
  pendingMultimediaUploadPropType,
} from 'lib/types/media-types';

import PropTypes from 'prop-types';

export type ChatInputState = {|
  pendingUploads: $ReadOnlyArray<PendingMultimediaUpload>,
  draft: string,
  appendFiles: (files: $ReadOnlyArray<File>) => Promise<void>,
  removePendingUpload: (pendingUpload: PendingMultimediaUpload) => void,
  clearPendingUploads: () => void,
  setDraft: (draft: string) => void,
|};
export const chatInputStatePropType = PropTypes.shape({
  pendingUploads: PropTypes.arrayOf(pendingMultimediaUploadPropType).isRequired,
  draft: PropTypes.string.isRequired,
  appendFiles: PropTypes.func.isRequired,
  removePendingUpload: PropTypes.func.isRequired,
  clearPendingUploads: PropTypes.func.isRequired,
  setDraft: PropTypes.func.isRequired,
});
