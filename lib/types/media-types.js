// @flow

import PropTypes from 'prop-types';

export type Dimensions = {|
  height: number,
  width: number,
|};

export const dimensionsPropType = PropTypes.shape({
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
});

export type MediaType = "photo" | "video";

export type Media = {|
  id: string,
  uri: string,
  type: MediaType,
|};

export const mediaTypePropType = PropTypes.oneOf([ "photo", "video" ]);

export const mediaPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  uri: PropTypes.string.isRequired,
  type: mediaTypePropType.isRequired,
});

export type UploadMultimediaResult = {|
  id: string,
  uri: string,
|};

export type AssignMediaServerIDToMessagePayload = {|
  messageID: string,
  mediaLocalID: string,
  mediaServerID: string,
|};

export type AssignMediaServerURIToMessagePayload = {|
  messageID: string,
  mediaID: string,
  serverURI: string,
|};

export type UploadDeletionRequest = {|
  id: string,
|};
