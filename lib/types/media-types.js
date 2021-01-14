// @flow

import PropTypes from 'prop-types';

import type { Shape } from './core';
import { type Platform, platformPropType } from './device-types';

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
  localMediaSelection?: NativeMediaSelection,
|};

export type Video = {|
  id: string,
  uri: string,
  type: 'video',
  dimensions: Dimensions,
  loop?: boolean,
  // stored on native only during creation in case retry needed after state lost
  localMediaSelection?: NativeMediaSelection,
|};

export type Media = Image | Video;

export type Corners = Shape<{|
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
  mediaType: MediaType,
  loop: boolean,
|};

export type UpdateMultimediaMessageMediaPayload = {|
  messageID: string,
  currentMediaID: string,
  mediaUpdate: Shape<Media>,
|};

export type UploadDeletionRequest = {|
  id: string,
|};

export type FFmpegStatistics = {|
  // seconds of video being processed per second
  +speed: number,
  // total milliseconds of video processed so far
  +time: number,
  // total result file size in bytes so far
  +size: number,
  +videoQuality: number,
  +videoFrameNumber: number,
  +videoFps: number,
  +bitrate: number,
|};

export type VideoProbeMediaMissionStep = {|
  step: 'video_probe',
  success: boolean,
  exceptionMessage: ?string,
  time: number, // ms
  path: string,
  validFormat: boolean,
  duration: ?number, // seconds
  codec: ?string,
  format: ?$ReadOnlyArray<string>,
  dimensions: ?Dimensions,
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

export type DetermineFileTypeMediaMissionStep = {|
  step: 'determine_file_type',
  success: boolean,
  exceptionMessage: ?string,
  time: number, // ms
  inputFilename: string,
  outputMIME: ?string,
  outputMediaType: ?MediaType,
  outputFilename: ?string,
|};

export type FrameCountMediaMissionStep = {|
  step: 'frame_count',
  success: boolean,
  exceptionMessage: ?string,
  time: number,
  path: string,
  mime: string,
  hasMultipleFrames: ?boolean,
|};

export type DisposeTemporaryFileMediaMissionStep = {|
  step: 'dispose_temporary_file',
  success: boolean,
  exceptionMessage: ?string,
  time: number, // ms
  path: string,
|};

export type MakeDirectoryMediaMissionStep = {|
  step: 'make_directory',
  success: boolean,
  exceptionMessage: ?string,
  time: number, // ms
  path: string,
|};

export type AndroidScanFileMediaMissionStep = {|
  step: 'android_scan_file',
  success: boolean,
  exceptionMessage: ?string,
  time: number, // ms
  path: string,
|};

export type FetchFileHashMediaMissionStep = {|
  step: 'fetch_file_hash',
  success: boolean,
  exceptionMessage: ?string,
  time: number, // ms
  path: string,
  hash: ?string,
|};

export type CopyFileMediaMissionStep = {|
  step: 'copy_file',
  success: boolean,
  exceptionMessage: ?string,
  time: number, // ms
  source: string,
  destination: string,
|};

export type GetOrientationMediaMissionStep = {|
  step: 'exif_fetch',
  success: boolean,
  exceptionMessage: ?string,
  time: number, // ms
  orientation: ?number,
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
      duration: number, // seconds
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
  duration: PropTypes.number.isRequired,
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
  captureTime: number, // ms timestamp
  selectTime: number, // ms timestamp
  sendTime: number, // ms timestamp
  retries: number,
|};

export type PhotoPaste = {|
  +step: 'photo_paste',
  +dimensions: Dimensions,
  +filename: string,
  +uri: string,
  +selectTime: number, // ms timestamp
  +sendTime: number, // ms timestamp
  +retries: number,
|};

const photoPasteSelectionPropType = PropTypes.exact({
  step: PropTypes.oneOf(['photo_paste']).isRequired,
  dimensions: dimensionsPropType.isRequired,
  filename: PropTypes.string.isRequired,
  uri: PropTypes.string.isRequired,
  selectTime: PropTypes.number.isRequired,
  sendTime: PropTypes.number.isRequired,
  retries: PropTypes.number.isRequired,
});

export type NativeMediaSelection =
  | MediaLibrarySelection
  | PhotoCapture
  | PhotoPaste;

export type MediaMissionStep =
  | NativeMediaSelection
  | {|
      step: 'web_selection',
      filename: string,
      size: number, // in bytes
      mime: string,
      selectTime: number, // ms timestamp
    |}
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
  | DetermineFileTypeMediaMissionStep
  | FrameCountMediaMissionStep
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
      stats: ?FFmpegStatistics,
    |}
  | DisposeTemporaryFileMediaMissionStep
  | {|
      step: 'save_media',
      uri: string,
      time: number, // ms timestamp
    |}
  | {|
      step: 'permissions_check',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      platform: Platform,
      permissions: $ReadOnlyArray<string>,
    |}
  | MakeDirectoryMediaMissionStep
  | AndroidScanFileMediaMissionStep
  | {|
      step: 'ios_save_to_library',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      uri: string,
    |}
  | {|
      step: 'fetch_blob',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      inputURI: string,
      uri: string,
      size: ?number,
      mime: ?string,
    |}
  | {|
      step: 'data_uri_from_blob',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      first255Chars: ?string,
    |}
  | {|
      step: 'array_buffer_from_blob',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
    |}
  | {|
      step: 'mime_check',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      mime: ?string,
    |}
  | {|
      step: 'write_file',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      path: string,
      length: number,
    |}
  | FetchFileHashMediaMissionStep
  | CopyFileMediaMissionStep
  | GetOrientationMediaMissionStep
  | {|
      step: 'preload_image',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      uri: string,
      dimensions: ?Dimensions,
    |}
  | {|
      step: 'reorient_image',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      uri: ?string,
    |}
  | {|
      step: 'upload',
      success: boolean,
      exceptionMessage: ?string,
      time: number, // ms
      inputFilename: string,
      outputMediaType: ?MediaType,
      outputURI: ?string,
      outputDimensions: ?Dimensions,
      outputLoop: ?boolean,
      hasWiFi?: boolean,
    |}
  | {|
      step: 'wait_for_capture_uri_unload',
      success: boolean,
      time: number, // ms
      uri: string,
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
      reason: 'media_type_fetch_failed',
      detectedMIME: ?string,
    |}
  | {|
      success: false,
      reason: 'mime_type_mismatch',
      reportedMediaType: MediaType,
      reportedMIME: string,
      detectedMIME: string,
    |}
  | {|
      success: false,
      reason: 'http_upload_failed',
      exceptionMessage: ?string,
    |}
  | {|
      success: false,
      reason: 'video_too_long',
      duration: number, // in seconds
    |}
  | {|
      success: false,
      reason: 'video_probe_failed',
    |}
  | {|
      success: false,
      reason: 'video_transcode_failed',
    |}
  | {|
      success: false,
      reason: 'processing_exception',
      time: number, // ms
      exceptionMessage: ?string,
    |}
  | {|
      success: false,
      reason: 'save_unsupported',
    |}
  | {|
      success: false,
      reason: 'missing_permission',
    |}
  | {|
      success: false,
      reason: 'make_directory_failed',
    |}
  | {|
      success: false,
      reason: 'resolve_failed',
      uri: string,
    |}
  | {|
      success: false,
      reason: 'save_to_library_failed',
      uri: string,
    |}
  | {|
      success: false,
      reason: 'fetch_failed',
    |}
  | {|
      success: false,
      reason: 'data_uri_failed',
    |}
  | {|
      success: false,
      reason: 'array_buffer_failed',
    |}
  | {|
      success: false,
      reason: 'mime_check_failed',
      mime: ?string,
    |}
  | {|
      success: false,
      reason: 'write_file_failed',
    |}
  | {|
      success: false,
      reason: 'fetch_file_hash_failed',
    |}
  | {|
      success: false,
      reason: 'copy_file_failed',
    |}
  | {|
      success: false,
      reason: 'exif_fetch_failed',
    |}
  | {|
      success: false,
      reason: 'reorient_image_failed',
    |}
  | {|
      success: false,
      reason: 'web_sibling_validation_failed',
    |};

export type MediaMissionResult = MediaMissionFailure | {| success: true |};

export type MediaMission = {|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionResult,
  userTime: number,
  totalTime: number,
|};

export const mediaMissionStepPropType = PropTypes.oneOfType([
  photoLibrarySelectionPropType,
  videoLibrarySelectionPropType,
  photoPasteSelectionPropType,
  PropTypes.shape({
    step: PropTypes.oneOf(['photo_capture']).isRequired,
    time: PropTypes.number.isRequired,
    dimensions: dimensionsPropType.isRequired,
    filename: PropTypes.string.isRequired,
    uri: PropTypes.string.isRequired,
    captureTime: PropTypes.number.isRequired,
    selectTime: PropTypes.number.isRequired,
    sendTime: PropTypes.number.isRequired,
    retries: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['web_selection']).isRequired,
    filename: PropTypes.string.isRequired,
    size: PropTypes.number.isRequired,
    mime: PropTypes.string.isRequired,
    selectTime: PropTypes.number.isRequired,
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
    step: PropTypes.oneOf(['determine_file_type']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    inputFilename: PropTypes.string.isRequired,
    outputMIME: PropTypes.string,
    outputMediaType: mediaTypePropType,
    outputFilename: PropTypes.string,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['frame_count']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    path: PropTypes.string.isRequired,
    mime: PropTypes.string.isRequired,
    hasMultipleFrames: PropTypes.bool,
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
    validFormat: PropTypes.bool.isRequired,
    duration: PropTypes.number,
    codec: PropTypes.string,
    format: PropTypes.arrayOf(PropTypes.string),
    dimensions: dimensionsPropType,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['video_ffmpeg_transcode']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    returnCode: PropTypes.number,
    newPath: PropTypes.string,
    stats: PropTypes.object,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['dispose_temporary_file']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    path: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['save_media']).isRequired,
    uri: PropTypes.string.isRequired,
    time: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['permissions_check']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    platform: platformPropType.isRequired,
    permissions: PropTypes.arrayOf(PropTypes.string).isRequired,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['make_directory']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    path: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['android_scan_file']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    path: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['fetch_file_hash']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    path: PropTypes.string.isRequired,
    hash: PropTypes.string,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['copy_file']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    source: PropTypes.string.isRequired,
    destination: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['ios_save_to_library']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    uri: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['fetch_blob']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    inputURI: PropTypes.string.isRequired,
    uri: PropTypes.string.isRequired,
    size: PropTypes.number,
    mime: PropTypes.string,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['data_uri_from_blob']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    first255Chars: PropTypes.string,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['array_buffer_from_blob']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['mime_check']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    mime: PropTypes.string,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['write_file']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    path: PropTypes.string.isRequired,
    length: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['exif_fetch']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    orientation: PropTypes.number,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['preload_image']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    uri: PropTypes.string.isRequired,
    dimensions: dimensionsPropType,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['reorient_image']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    uri: PropTypes.string,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['upload']).isRequired,
    success: PropTypes.bool.isRequired,
    exceptionMessage: PropTypes.string,
    time: PropTypes.number.isRequired,
    inputFilename: PropTypes.string.isRequired,
    outputMediaType: mediaTypePropType,
    outputURI: PropTypes.string,
    outputDimensions: dimensionsPropType,
    outputLoop: PropTypes.bool,
    hasWiFi: PropTypes.bool,
  }),
  PropTypes.shape({
    step: PropTypes.oneOf(['wait_for_capture_uri_unload']).isRequired,
    success: PropTypes.bool.isRequired,
    time: PropTypes.number.isRequired,
    uri: PropTypes.string.isRequired,
  }),
]);

export const mediaMissionPropType = PropTypes.shape({
  steps: PropTypes.arrayOf(mediaMissionStepPropType).isRequired,
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
      reason: PropTypes.oneOf(['media_type_fetch_failed']).isRequired,
      detectedMIME: PropTypes.string,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['mime_type_mismatch']).isRequired,
      reportedMediaType: mediaTypePropType.isRequired,
      reportedMIME: PropTypes.string.isRequired,
      detectedMIME: PropTypes.string.isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['http_upload_failed']).isRequired,
      exceptionMessage: PropTypes.string,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['video_too_long']).isRequired,
      duration: PropTypes.number.isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['video_probe_failed']).isRequired,
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
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['save_unsupported']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['missing_permission']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['make_directory_failed']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['resolve_failed']).isRequired,
      uri: PropTypes.string.isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['save_to_library_failed']).isRequired,
      uri: PropTypes.string.isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['fetch_failed']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['data_uri_failed']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['array_buffer_failed']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['mime_check_failed']).isRequired,
      mime: PropTypes.string,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['write_file_failed']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['fetch_file_hash_failed']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['copy_file_failed']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['exif_fetch_failed']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['reorient_image_failed']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['web_sibling_validation_failed']).isRequired,
    }),
  ]),
  userTime: PropTypes.number.isRequired,
  totalTime: PropTypes.number.isRequired,
});
