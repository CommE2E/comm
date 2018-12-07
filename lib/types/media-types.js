// @flow

import PropTypes from 'prop-types';

export type MediaType = "photo" | "video";

export type Media = {|
  uri: string,
  type: MediaType,
|};

const mediaTypePropType = PropTypes.oneOf([ "photo", "video" ]);

export const mediaPropType = PropTypes.shape({
  uri: PropTypes.string.isRequired,
  type: mediaTypePropType.isRequired,
});

export type PendingMultimediaUpload = {|
  file: File,
  mediaType: MediaType,
  uri: string,
|};
export const pendingMultimediaUploadPropType = PropTypes.shape({
  file: PropTypes.object.isRequired,
  mediaType: mediaTypePropType.isRequired,
  uri: PropTypes.string.isRequired,
});
