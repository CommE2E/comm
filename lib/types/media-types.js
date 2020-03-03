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

// stored on native only during creation in case retry needed after state lost
type LocalMediaCreationInfo = {|
  filename: string,
  unlinkURIAfterRemoving: ?bool,
|};

export type Image = {|
  id: string,
  uri: string,
  type: "photo",
  dimensions: Dimensions,
  localMediaCreationInfo?: LocalMediaCreationInfo,
|};

export type Video = {|
  id: string,
  uri: string,
  type: "video",
  dimensions: Dimensions,
  localMediaCreationInfo?: LocalMediaCreationInfo,
|};

export type Media =
  | Image
  | Video;

export type Corners = $Shape<{|
  topLeft: bool,
  topRight: bool,
  bottomLeft: bool,
  bottomRight: bool,
|}>;

export type MediaInfo =
  | {|
      ...Image,
      corners: Corners,
      index: number,
    |}
  | {|
      ...Video,
      corners: Corners,
      index: number,
    |};

export const mediaTypePropType = PropTypes.oneOf([ "photo", "video" ]);

const mediaPropTypes = {
  id: PropTypes.string.isRequired,
  uri: PropTypes.string.isRequired,
  type: mediaTypePropType.isRequired,
  dimensions: dimensionsPropType.isRequired,
  filename: PropTypes.string,
};

export const mediaPropType = PropTypes.shape(mediaPropTypes);

export const cornersPropType = PropTypes.shape({
  topLeft: PropTypes.bool,
  topRight: PropTypes.bool,
  bottomLeft: PropTypes.bool,
  bottomRight: PropTypes.bool,
});

export const mediaInfoPropType = PropTypes.shape({
  ...mediaPropTypes,
  corners: cornersPropType.isRequired,
  index: PropTypes.number.isRequired,
});

export type UploadMultimediaResult = {|
  id: string,
  uri: string,
|};

export type UpdateMultimediaMessageMediaPayload = {|
  messageID: string,
  currentMediaID: string,
  mediaUpdate: $Shape<Media>,
|};

export type UploadDeletionRequest = {|
  id: string,
|};

export type VideoProbeMediaMissionStep = {|
  step: "video_probe",
  success: bool,
  time: number, // ms
  path: string,
  ext: ?string,
  codec: ?string,
|};

export type MediaMissionStep =
  | {|
      step: "photo_capture",
      time: number, // ms
      dimensions: Dimensions,
      filename: string,
      uri: string,
    |}
  | {|
      step: "photo_library",
      dimensions: Dimensions,
      filename: string,
      uri: string,
    |}
  | {|
      step: "video_library",
      dimensions: Dimensions,
      filename: string,
      uri: string,
      playableDuration: number,
    |}
  | {|
      step: "validation",
      type: MediaType,
      success: bool,
      time: number, // ms
      blobFetched: bool,
      blobMIME: ?string,
      reportedMIME: ?string,
      blobName: ?string,
      size: ?number,
    |}
  | {|
      step: "photo_resize_transcode",
      success: bool,
      time: number, // ms
      newMIME: ?string,
      newDimensions: ?Dimensions,
      newURI: ?string,
      newPath: ?string,
      newName: ?string,
    |}
  | {|
      step: "video_copy",
      success: bool,
      time: number, // ms
      newPath: ?string,
    |}
  | VideoProbeMediaMissionStep
  | {|
      step: "video_ios_native_transcode",
      success: bool,
      time: number, // ms
      newPath: ?string,
    |}
  | {|
      step: "video_ffmpeg_transcode",
      success: bool,
      time: number, // ms
      returnCode: ?number,
      newPath: ?string,
    |}
  | {|
      step: "final_file_data_analysis",
      success: bool,
      time: number, // ms
      uri: string,
      detectedMIME: ?string,
      detectedMediaType: ?string,
      newName: ?string,
    |}
  | {|
      step: "dispose_uploaded_local_file",
      success: bool,
      time: number, // ms
      path: string,
    |};

export type MediaMissionFailure =
  | {|
      success: false,
      reason: "too_large_cant_downscale",
      size: number, // in bytes
    |}
  | {|
      success: false,
      reason: "blob_reported_mime_issue",
      mime: ?string,
    |}
  | {|
      success: false,
      reason: "file_data_detected_mime_issue",
      reportedMIME: string,
      reportedMediaType: MediaType,
      detectedMIME: ?string,
      detectedMediaType: ?MediaType,
    |}
  | {|
      success: false,
      reason: "http_upload_failed",
    |}
  | {|
      success: false,
      reason: "video_path_extraction_failed",
      uri: string,
    |}
  | {|
      success: false,
      reason: "video_ios_asset_copy_failed",
      inputURI: string,
      destinationPath: string,
    |}
  | {|
      success: false,
      reason: "video_transcode_failed",
    |};

type MediaMissionResult =
  | MediaMissionFailure
  | {| success: true |};

export type MediaMission = {|
  steps: MediaMissionStep[],
  result: MediaMissionResult,
|};
