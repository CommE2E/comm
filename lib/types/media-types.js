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
  time: number, // ms
  path: string,
  ext: ?string,
  codec: ?string,
|};

export type MediaLibrarySelection =
  | {|
      step: 'photo_library',
      dimensions: Dimensions,
      filename: string,
      uri: string,
      mediaNativeID: string,
    |}
  | {|
      step: 'video_library',
      dimensions: Dimensions,
      filename: string,
      uri: string,
      mediaNativeID: string,
      playableDuration: number,
    |};

const photoLibrarySelectionPropType = PropTypes.shape({
  step: PropTypes.oneOf(['photo_library']).isRequired,
  dimensions: dimensionsPropType.isRequired,
  filename: PropTypes.string.isRequired,
  uri: PropTypes.string.isRequired,
});

const videoLibrarySelectionPropType = PropTypes.shape({
  step: PropTypes.oneOf(['video_library']).isRequired,
  dimensions: dimensionsPropType.isRequired,
  filename: PropTypes.string.isRequired,
  uri: PropTypes.string.isRequired,
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
|};

export type MediaSelection = MediaLibrarySelection | PhotoCapture;

export type MediaMissionStep =
  | MediaSelection
  | {|
      step: 'validation',
      type: MediaType,
      success: boolean,
      time: number, // ms
      blobFetched: boolean,
      blobMIME: ?string,
      reportedMIME: ?string,
      blobName: ?string,
      size: ?number,
    |}
  | {|
      step: 'exif_fetch',
      success: boolean,
      time: number, // ms
      orientation: ?number,
    |}
  | {|
      step: 'photo_manipulation',
      success: boolean,
      time: number, // ms
      manipulation: Object,
      newMIME: ?string,
      newDimensions: ?Dimensions,
      newURI: ?string,
    |}
  | {|
      step: 'video_copy',
      success: boolean,
      time: number, // ms
      newPath: ?string,
    |}
  | VideoProbeMediaMissionStep
  | {|
      step: 'video_ios_native_transcode',
      success: boolean,
      time: number, // ms
      newPath: ?string,
    |}
  | {|
      step: 'video_ffmpeg_transcode',
      success: boolean,
      time: number, // ms
      returnCode: ?number,
      newPath: ?string,
    |}
  | {|
      step: 'final_file_data_analysis',
      success: boolean,
      time: number, // ms
      uri: string,
      detectedMIME: ?string,
      detectedMediaType: ?string,
      newName: ?string,
    |}
  | {|
      step: 'dispose_uploaded_local_file',
      success: boolean,
      time: number, // ms
      path: string,
    |}
  | {|
      step: 'upload',
      success: boolean,
      time: number,
    |}
  | {|
      step: 'processing_exception',
      time: number,
      message: ?string,
    |};

export type MediaMissionFailure =
  | {|
      success: false,
      reason: 'photo_manipulation_failed',
      size: number, // in bytes
    |}
  | {|
      success: false,
      reason: 'blob_reported_mime_issue',
      mime: ?string,
    |}
  | {|
      success: false,
      reason: 'file_data_detected_mime_issue',
      reportedMIME: string,
      reportedMediaType: MediaType,
      detectedMIME: ?string,
      detectedMediaType: ?MediaType,
    |}
  | {|
      success: false,
      reason: 'http_upload_failed',
      message: ?string,
    |}
  | {|
      success: false,
      reason: 'video_path_extraction_failed',
      uri: string,
    |}
  | {|
      success: false,
      reason: 'video_ios_asset_copy_failed',
      inputURI: string,
      destinationPath: string,
    |}
  | {|
      success: false,
      reason: 'video_transcode_failed',
    |}
  | {|
      success: false,
      reason: 'processing_exception',
      time: number,
      message: ?string,
    |};

export type MediaMissionResult =
  | MediaMissionFailure
  | {| success: true, totalTime: number |};

export type MediaMission = {|
  steps: MediaMissionStep[],
  result: MediaMissionResult,
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
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['validation']).isRequired,
        type: mediaTypePropType.isRequired,
        success: PropTypes.bool.isRequired,
        time: PropTypes.number.isRequired,
        blobFetched: PropTypes.bool.isRequired,
        blobMIME: PropTypes.string,
        reportedMIME: PropTypes.string,
        blobName: PropTypes.string,
        size: PropTypes.number,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['exif_fetch']).isRequired,
        success: PropTypes.bool.isRequired,
        time: PropTypes.number.isRequired,
        orientation: PropTypes.number,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['photo_manipulation']).isRequired,
        success: PropTypes.bool.isRequired,
        time: PropTypes.number.isRequired,
        manipulation: PropTypes.object.isRequired,
        newMIME: PropTypes.string,
        newDimensions: dimensionsPropType,
        newURI: PropTypes.string,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['video_copy']).isRequired,
        success: PropTypes.bool.isRequired,
        time: PropTypes.number.isRequired,
        newPath: PropTypes.string,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['video_probe']).isRequired,
        success: PropTypes.bool.isRequired,
        time: PropTypes.number.isRequired,
        path: PropTypes.string.isRequired,
        ext: PropTypes.string,
        codec: PropTypes.string,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['video_ios_native_transcode']).isRequired,
        success: PropTypes.bool.isRequired,
        time: PropTypes.number.isRequired,
        newPath: PropTypes.string,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['video_ffmpeg_transcode']).isRequired,
        success: PropTypes.bool.isRequired,
        time: PropTypes.number.isRequired,
        returnCode: PropTypes.number,
        newPath: PropTypes.string,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['final_file_data_analysis']).isRequired,
        success: PropTypes.bool.isRequired,
        time: PropTypes.number.isRequired,
        uri: PropTypes.string.isRequired,
        detectedMIME: PropTypes.string,
        detectedMediaType: mediaTypePropType,
        newName: PropTypes.string,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['dispose_uploaded_local_file']).isRequired,
        success: PropTypes.bool.isRequired,
        time: PropTypes.number.isRequired,
        path: PropTypes.string.isRequired,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['upload']).isRequired,
        success: PropTypes.bool.isRequired,
        time: PropTypes.number.isRequired,
      }),
      PropTypes.shape({
        step: PropTypes.oneOf(['processing_exception']).isRequired,
        success: PropTypes.bool.isRequired,
        message: PropTypes.string,
      }),
    ]),
  ).isRequired,
  result: PropTypes.oneOfType([
    PropTypes.shape({
      success: PropTypes.oneOf([true]).isRequired,
      totalTime: PropTypes.number.isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['photo_manipulation_failed']).isRequired,
      size: PropTypes.number.isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['blob_reported_mime_issue']).isRequired,
      mime: PropTypes.string,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['file_data_detected_mime_issue']).isRequired,
      reportedMIME: PropTypes.string.isRequired,
      reportedMediaType: mediaTypePropType.isRequired,
      detectedMIME: PropTypes.string,
      detectedMediaType: mediaTypePropType,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['http_upload_failed']).isRequired,
      message: PropTypes.string,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['video_path_extraction_failed']).isRequired,
      uri: PropTypes.string.isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['video_ios_asset_copy_failed']).isRequired,
      inputURI: PropTypes.string.isRequired,
      destinationPath: PropTypes.string.isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['video_transcode_failed']).isRequired,
    }),
    PropTypes.shape({
      success: PropTypes.oneOf([false]).isRequired,
      reason: PropTypes.oneOf(['processing_exception']).isRequired,
      time: PropTypes.number.isRequired,
      message: PropTypes.string,
    }),
  ]),
});
