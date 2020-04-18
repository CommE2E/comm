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

export type MediaType = 'photo' | 'video';

export type Image = {|
  id: string,
  uri: string,
  type: 'photo',
  dimensions: Dimensions,
  // stored on native only during creation in case retry needed after state lost
  localMediaSelection?: MediaSelection,
|};

export type Video = {|
  id: string,
  uri: string,
  type: 'video',
  dimensions: Dimensions,
  // stored on native only during creation in case retry needed after state lost
  localMediaSelection?: MediaSelection,
|};

export type Media = Image | Video;

export type Corners = $Shape<{|
  topLeft: boolean,
  topRight: boolean,
  bottomLeft: boolean,
  bottomRight: boolean,
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

export const mediaTypePropType = PropTypes.oneOf(['photo', 'video']);

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
  dimensions: Dimensions,
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
  step: 'video_probe',
  success: boolean,
  exceptionMessage: ?string,
  time: number, // ms
  path: string,
  ext: ?string,
  codec: ?string,
  format: ?string,
|};

export type ReadFileHeaderMediaMissionStep = {|
  step: 'read_file_header',
  success: boolean,
  exceptionMessage: ?string,
  time: number, // ms
  uri: string,
  mime: ?string,
  mediaType: ?MediaType,
|};

export type MediaLibrarySelection =
  | {|
      step: 'photo_library',
      dimensions: Dimensions,
      filename: string,
      uri: string,
      mediaNativeID: string,
      selectTime: number, // ms timestamp
      sendTime: number, // ms timestamp
      retries: number,
    |}
  | {|
      step: 'video_library',
      dimensions: Dimensions,
      filename: string,
      uri: string,
      mediaNativeID: string,
      selectTime: number, // ms timestamp
      sendTime: number, // ms timestamp
      retries: number,
      playableDuration: number,
    |};

const photoLibrarySelectionPropType = PropTypes.shape({
  step: PropTypes.oneOf(['photo_library']).isRequired,
  dimensions: dimensionsPropType.isRequired,
  filename: PropTypes.string.isRequired,
  uri: PropTypes.string.isRequired,
  mediaNativeID: PropTypes.string.isRequired,
  selectTime: PropTypes.number.isRequired,
  sendTime: PropTypes.number.isRequired,
  retries: PropTypes.number.isRequired,
});

const videoLibrarySelectionPropType = PropTypes.shape({
  step: PropTypes.oneOf(['video_library']).isRequired,
  dimensions: dimensionsPropType.isRequired,
  filename: PropTypes.string.isRequired,
  uri: PropTypes.string.isRequired,
  mediaNativeID: PropTypes.string.isRequired,
  selectTime: PropTypes.number.isRequired,
  sendTime: PropTypes.number.isRequired,
  retries: PropTypes.number.isRequired,
  playableDuration: PropTypes.number.isRequired,
});

export const mediaLibrarySelectionPropType = PropTypes.oneOfType([
  photoLibrarySelectionPropType,
  videoLibrarySelectionPropType,
]);

export type PhotoCapture = {|
  step: 'photo_capture',
  time: number, // ms
  dimensions: Dimensions,
  filename: string,
  uri: string,
  selectTime: number, // ms timestamp
  sendTime: number, // ms timestamp
  retries: number,
|};

export type MediaSelection = MediaLibrarySelection | PhotoCapture;

export type MediaMissionStep =
  | MediaSelection
  | {|
      step: 'asset_info_fetch',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      localURI: ?string,
      orientation: ?number,
    |}
  | {|
      step: 'stat_file',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      uri: string,
      fileSize: ?number,
    |}
  | ReadFileHeaderMediaMissionStep
  | {|
      step: 'photo_manipulation',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      manipulation: Object,
      newMIME: ?string,
      newDimensions: ?Dimensions,
      newURI: ?string,
    |}
  | VideoProbeMediaMissionStep
  | {|
      step: 'video_ffmpeg_transcode',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      returnCode: ?number,
      newPath: ?string,
    |}
  | {|
      step: 'dispose_uploaded_local_file',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      path: string,
    |}
  | {|
      step: 'upload',
      success: boolean,
      exceptionMessage: ?string,
      filename: string,
      time: number, // ms
    |}
  | {|
      step: 'processing_exception',
      time: number,
      exceptionMessage: ?string,
    |};

export type MediaMissionFailure =
  | {|
      success: false,
      reason: 'no_file_path',
    |}
  | {|
      success: false,
      reason: 'file_stat_failed',
      uri: string,
    |}
  | {|
      success: false,
      reason: 'photo_manipulation_failed',
      size: number, // in bytes
    |}
  | {|
      success: false,
      reason: 'media_type_mismatch',
      reportedMediaType: MediaType,
      detectedMediaType: MediaType,
      detectedMIME: ?string,
    |}
  | {|
      success: false,
      reason: 'mime_fetch_failed',
    |}
  | {|
      success: false,
      reason: 'mime_type_mismatch',
      reportedMediaType: MediaType,
      reportedMIME: string,
      detectedMediaType: ?MediaType,
      detectedMIME: string,
    |}
  | {|
      success: false,
      reason: 'http_upload_failed',
      exceptionMessage: ?string,
    |}
  | {|
      success: false,
      reason: 'video_transcode_failed',
    |}
  | {|
      success: false,
      reason: 'processing_exception',
      time: number,
      exceptionMessage: ?string,
    |};

export type MediaMissionResult = MediaMissionFailure | {| success: true |};

export type MediaMission = {|
  steps: MediaMissionStep[],
  result: MediaMissionResult,
  userTime: number,
  totalTime: number,
|};

export const mediaMissionPropType = PropTypes.shape({
  steps: PropTypes.arrayOf(
    PropTypes.oneOfType([
      photoLibrarySelectionPropType,
      videoLibrarySelectionPropType,
      PropTypes.shape({
        step: PropTypes.oneOf(['photo_capture']).isRequired,
        time: PropTypes.number.isRequired,
        dimensions: dimensionsPropType.isRequired,
        filename: PropTypes.string.isRequired,
        uri: PropTypes.string.isRequired,
        selectTime: PropTypes.number.isRequired,
        sendTime: PropTypes.number.isRequired,
        retries: PropTypes.number.isRequired,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['asset_info_fetch']).isRequired,
        success: PropTypes.bool.isRequired,
        exceptionMessage: PropTypes.string,
        time: PropTypes.number.isRequired,
        localURI: PropTypes.string,
        orientation: PropTypes.number,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['stat_file']).isRequired,
        success: PropTypes.bool.isRequired,
        exceptionMessage: PropTypes.string,
        time: PropTypes.number.isRequired,
        uri: PropTypes.string.isRequired,
        fileSize: PropTypes.number,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['read_file_header']).isRequired,
        success: PropTypes.bool.isRequired,
        exceptionMessage: PropTypes.string,
        time: PropTypes.number.isRequired,
        uri: PropTypes.string.isRequired,
        mime: PropTypes.string,
        mediaType: mediaTypePropType,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['photo_manipulation']).isRequired,
        success: PropTypes.bool.isRequired,
        exceptionMessage: PropTypes.string,
        time: PropTypes.number.isRequired,
        manipulation: PropTypes.object.isRequired,
        newMIME: PropTypes.string,
        newDimensions: dimensionsPropType,
        newURI: PropTypes.string,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['video_probe']).isRequired,
        success: PropTypes.bool.isRequired,
        exceptionMessage: PropTypes.string,
        time: PropTypes.number.isRequired,
        path: PropTypes.string.isRequired,
        ext: PropTypes.string,
        codec: PropTypes.string,
        format: PropTypes.string,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['video_ffmpeg_transcode']).isRequired,
        success: PropTypes.bool.isRequired,
        exceptionMessage: PropTypes.string,
        time: PropTypes.number.isRequired,
        returnCode: PropTypes.number,
        newPath: PropTypes.string,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['dispose_uploaded_local_file']).isRequired,
        success: PropTypes.bool.isRequired,
        exceptionMessage: PropTypes.string,
        time: PropTypes.number.isRequired,
        path: PropTypes.string.isRequired,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['upload']).isRequired,
        success: PropTypes.bool.isRequired,
        exceptionMessage: PropTypes.string,
        filename: PropTypes.string.isRequired,
        time: PropTypes.number.isRequired,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['processing_exception']).isRequired,
        success: PropTypes.bool.isRequired,
        exceptionMessage: PropTypes.string,
      }),
    ]),
  ).isRequired,
  result: PropTypes.oneOfType([
    PropTypes.shape({
      success: PropTypes.oneOf([true]).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['no_file_path']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['file_stat_failed']).isRequired,
      uri: PropTypes.string.isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['photo_manipulation_failed']).isRequired,
      size: PropTypes.number.isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['media_type_mismatch']).isRequired,
      reportedMediaType: mediaTypePropType.isRequired,
      detectedMediaType: mediaTypePropType.isRequired,
      detectedMIME: PropTypes.string,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['mime_fetch_failed']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['mime_type_mismatch']).isRequired,
      reportedMediaType: mediaTypePropType.isRequired,
      reportedMIME: PropTypes.string.isRequired,
      detectedMediaType: mediaTypePropType,
      detectedMIME: PropTypes.string.isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['http_upload_failed']).isRequired,
      exceptionMessage: PropTypes.string,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['video_transcode_failed']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['processing_exception']).isRequired,
      time: PropTypes.number.isRequired,
      exceptionMessage: PropTypes.string,
    }),
  ]),
  userTime: PropTypes.number.isRequired,
  totalTime: PropTypes.number.isRequired,
});
