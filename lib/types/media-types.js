// @flow

import PropTypes from 'prop-types';

export type Dimensions = $ReadOnly<{|
  height: number,
  width: number,
|}>;

export const dimensionsPropType = PropTypes.shape({
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
});

export type MediaType = "photo" | "video";

export type Media = {|
  id: string,
  uri: string,
  type: MediaType,
  dimensions: Dimensions,
|};

export type MediaInfo = {|
  ...Media,
  index: number,
  messageID: string,
|};

export const mediaTypePropType = PropTypes.oneOf([ "photo", "video" ]);

const mediaPropTypes = {
  id: PropTypes.string.isRequired,
  uri: PropTypes.string.isRequired,
  type: mediaTypePropType.isRequired,
  dimensions: dimensionsPropType.isRequired,
};

export const mediaPropType = PropTypes.shape(mediaPropTypes);

export const mediaInfoPropType = PropTypes.shape({
  ...mediaPropTypes,
  index: PropTypes.number.isRequired,
  messageID: PropTypes.string.isRequired,
});

export type UploadMultimediaResult = {|
  id: string,
  uri: string,
|};

export type UpdateMultimediaMessageMediaPayload = {|
  messageID: string,
  currentMediaID: string,
  mediaUpdate: $Shape<{|
    id: string,
    uri: string,
  |}>,
|};

export type UploadDeletionRequest = {|
  id: string,
|};
