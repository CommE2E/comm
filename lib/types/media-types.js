// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import type { ClientEncryptedImageAvatar } from './avatar-types';
import { type Platform } from './device-types.js';
import { tShape, tString, tID } from '../utils/validation-utils.js';

export type Dimensions = $ReadOnly<{
  +height: number,
  +width: number,
}>;

export const dimensionsValidator: TInterface<Dimensions> = tShape<Dimensions>({
  height: t.Number,
  width: t.Number,
});

export type MediaType = 'photo' | 'video';
const mediaTypeValidator = t.enums.of(['photo', 'video']);

export type EncryptedMediaType = 'encrypted_photo' | 'encrypted_video';

export type AvatarMediaInfo =
  | ClientEncryptedImageAvatar
  | {
      +type: 'photo',
      +uri: string,
    };

export type ClientDBMediaInfo = {
  +id: string,
  +uri: string,
  +type: 'photo' | 'video',
  +extras: string,
};

export type Corners = Partial<{
  +topLeft: boolean,
  +topRight: boolean,
  +bottomLeft: boolean,
  +bottomRight: boolean,
}>;

export type MediaInfo =
  | {
      ...Image,
      +index: number,
    }
  | {
      ...Video,
      +index: number,
    }
  | {
      ...EncryptedImage,
      +index: number,
    }
  | {
      ...EncryptedVideo,
      +index: number,
    };

export type UploadMultimediaResult = {
  +id: string,
  +uri: string,
  +dimensions: Dimensions,
  +mediaType: MediaType,
  +loop: boolean,
};
export const uploadMultimediaResultValidator: TInterface<UploadMultimediaResult> =
  tShape<UploadMultimediaResult>({
    id: tID,
    uri: t.String,
    dimensions: dimensionsValidator,
    mediaType: mediaTypeValidator,
    loop: t.Boolean,
  });

export type UpdateMultimediaMessageMediaPayload = {
  +messageID: string,
  +currentMediaID: string,
  +mediaUpdate: MediaShape,
};

export type UploadDeletionRequest = {
  +id: string,
};

export type UploadMediaMetadataRequest = {
  ...Dimensions,
  +filename: string,
  +blobHolder: string,
  +blobHash: string,
  +encryptionKey: string,
  +mimeType: string,
  +loop?: boolean,
  +thumbHash?: string,
};

export type TranscodingStatistics = {
  // seconds of video being processed per second
  +speed: number,
  // total milliseconds of video processed so far
  +time: number,
  // total result file size in bytes so far
  +size: number,
};

export type TranscodeVideoMediaMissionStep = {
  +step: 'video_transcode',
  +success: boolean,
  +exceptionMessage: ?string,
  +time: number, // ms
  +newPath: ?string,
  +stats: ?TranscodingStatistics,
};

export type VideoGenerateThumbnailMediaMissionStep = {
  +step: 'video_generate_thumbnail',
  +success: boolean,
  +time: number, // ms
  +exceptionMessage: ?string,
  +thumbnailURI: string,
};

export type VideoInfo = {
  +codec: string,
  +dimensions: Dimensions,
  +duration: number, // seconds
  +format: string,
};

export type VideoProbeMediaMissionStep = {
  +step: 'video_probe',
  +success: boolean,
  +exceptionMessage: ?string,
  +time: number, // ms
  +path: string,
  +validFormat: boolean,
  +duration: ?number, // seconds
  +codec: ?string,
  +format: ?string,
  +dimensions: ?Dimensions,
};

export type ReadFileHeaderMediaMissionStep = {
  +step: 'read_file_header',
  +success: boolean,
  +exceptionMessage: ?string,
  +time: number, // ms
  +uri: string,
  +mime: ?string,
  +mediaType: ?MediaType,
};

export type DetermineFileTypeMediaMissionStep = {
  +step: 'determine_file_type',
  +success: boolean,
  +exceptionMessage: ?string,
  +time: number, // ms
  +inputFilename: string,
  +outputMIME: ?string,
  +outputMediaType: ?MediaType,
  +outputFilename: ?string,
};

export type FrameCountMediaMissionStep = {
  +step: 'frame_count',
  +success: boolean,
  +exceptionMessage: ?string,
  +time: number,
  +path: string,
  +mime: string,
  +hasMultipleFrames: ?boolean,
};

export type DisposeTemporaryFileMediaMissionStep = {
  +step: 'dispose_temporary_file',
  +success: boolean,
  +exceptionMessage: ?string,
  +time: number, // ms
  +path: string,
};

export type MakeDirectoryMediaMissionStep = {
  +step: 'make_directory',
  +success: boolean,
  +exceptionMessage: ?string,
  +time: number, // ms
  +path: string,
};

export type AndroidScanFileMediaMissionStep = {
  +step: 'android_scan_file',
  +success: boolean,
  +exceptionMessage: ?string,
  +time: number, // ms
  +path: string,
};

export type FetchFileHashMediaMissionStep = {
  +step: 'fetch_file_hash',
  +success: boolean,
  +exceptionMessage: ?string,
  +time: number, // ms
  +path: string,
  +hash: ?string,
};

export type CopyFileMediaMissionStep = {
  +step: 'copy_file',
  +success: boolean,
  +exceptionMessage: ?string,
  +time: number, // ms
  +source: string,
  +destination: string,
};

export type GetOrientationMediaMissionStep = {
  +step: 'exif_fetch',
  +success: boolean,
  +exceptionMessage: ?string,
  +time: number, // ms
  +orientation: ?number,
};

export type GenerateThumbhashMediaMissionStep = {
  +step: 'generate_thumbhash',
  +success: boolean,
  +exceptionMessage: ?string,
  +thumbHash: ?string,
};

export type EncryptFileMediaMissionStep =
  | {
      +step: 'read_plaintext_file',
      +file: string,
      +time: number, // ms
      +success: boolean,
      +exceptionMessage: ?string,
    }
  | {
      +step: 'encrypt_data',
      +dataSize: number,
      +time: number, // ms
      +isPadded: boolean,
      +sha256: ?string,
      +success: boolean,
      +exceptionMessage: ?string,
    }
  | {
      +step: 'write_encrypted_file',
      +file: string,
      +time: number, // ms
      +success: boolean,
      +exceptionMessage: ?string,
    };

export type DecryptFileMediaMissionStep =
  | {
      +step: 'fetch_file',
      +file: string,
      +time: number,
      +success: boolean,
      +exceptionMessage: ?string,
    }
  | {
      +step: 'decrypt_data',
      +dataSize: number,
      +time: number,
      +isPadded: boolean,
      +success: boolean,
      +exceptionMessage: ?string,
    }
  | {
      +step: 'write_file',
      +file: string,
      +mimeType: string,
      +time: number,
      +success: boolean,
      +exceptionMessage: ?string,
    }
  | {
      +step: 'create_data_uri',
      +mimeType: string,
      +time: number,
      +success: boolean,
      +exceptionMessage: ?string,
    };

export type MediaLibrarySelection =
  | {
      +step: 'photo_library',
      +dimensions: Dimensions,
      +filename: ?string,
      +uri: string,
      +mediaNativeID: ?string,
      +selectTime: number, // ms timestamp
      +sendTime: number, // ms timestamp
      +retries: number,
    }
  | {
      +step: 'video_library',
      +dimensions: Dimensions,
      +filename: ?string,
      +uri: string,
      +mediaNativeID: ?string,
      +selectTime: number, // ms timestamp
      +sendTime: number, // ms timestamp
      +retries: number,
      +duration: number, // seconds
    };

export const mediaLibrarySelectionValidator: TUnion<MediaLibrarySelection> =
  t.union([
    tShape({
      step: tString('photo_library'),
      dimensions: dimensionsValidator,
      filename: t.maybe(t.String),
      uri: t.String,
      mediaNativeID: t.maybe(t.String),
      selectTime: t.Number,
      sendTime: t.Number,
      retries: t.Number,
    }),
    tShape({
      step: tString('video_library'),
      dimensions: dimensionsValidator,
      filename: t.maybe(t.String),
      uri: t.String,
      mediaNativeID: t.maybe(t.String),
      selectTime: t.Number,
      sendTime: t.Number,
      retries: t.Number,
      duration: t.Number,
    }),
  ]);

export type PhotoCapture = {
  +step: 'photo_capture',
  +time: number, // ms
  +dimensions: Dimensions,
  +filename: string,
  +uri: string,
  +captureTime: number, // ms timestamp
  +selectTime: number, // ms timestamp
  +sendTime: number, // ms timestamp
  +retries: number,
};

export const photoCaptureValidator: TInterface<PhotoCapture> =
  tShape<PhotoCapture>({
    step: tString('photo_capture'),
    time: t.Number,
    dimensions: dimensionsValidator,
    filename: t.String,
    uri: t.String,
    captureTime: t.Number,
    selectTime: t.Number,
    sendTime: t.Number,
    retries: t.Number,
  });

export type PhotoPaste = {
  +step: 'photo_paste',
  +dimensions: Dimensions,
  +filename: string,
  +uri: string,
  +selectTime: number, // ms timestamp
  +sendTime: number, // ms timestamp
  +retries: number,
};

export const photoPasteValidator: TInterface<PhotoPaste> = tShape<PhotoPaste>({
  step: tString('photo_paste'),
  dimensions: dimensionsValidator,
  filename: t.String,
  uri: t.String,
  selectTime: t.Number,
  sendTime: t.Number,
  retries: t.Number,
});

export type NativeMediaSelection =
  | MediaLibrarySelection
  | PhotoCapture
  | PhotoPaste;

export const nativeMediaSelectionValidator: TUnion<NativeMediaSelection> =
  t.union([
    mediaLibrarySelectionValidator,
    photoCaptureValidator,
    photoPasteValidator,
  ]);

export type MediaMissionStep =
  | NativeMediaSelection
  | {
      +step: 'web_selection',
      +filename: string,
      +size: number, // in bytes
      +mime: string,
      +selectTime: number, // ms timestamp
    }
  | {
      +step: 'asset_info_fetch',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +localURI: ?string,
      +orientation: ?number,
    }
  | {
      +step: 'stat_file',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +uri: string,
      +fileSize: ?number,
    }
  | ReadFileHeaderMediaMissionStep
  | DetermineFileTypeMediaMissionStep
  | FrameCountMediaMissionStep
  | {
      +step: 'photo_manipulation',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +manipulation: Object,
      +newMIME: ?string,
      +newDimensions: ?Dimensions,
      +newURI: ?string,
    }
  | VideoProbeMediaMissionStep
  | TranscodeVideoMediaMissionStep
  | VideoGenerateThumbnailMediaMissionStep
  | DisposeTemporaryFileMediaMissionStep
  | {
      +step: 'save_media',
      +uri: string,
      +time: number, // ms timestamp
    }
  | {
      +step: 'permissions_check',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +platform: Platform,
      +permissions: $ReadOnlyArray<string>,
    }
  | MakeDirectoryMediaMissionStep
  | AndroidScanFileMediaMissionStep
  | {
      +step: 'ios_save_to_library',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +uri: string,
    }
  | {
      +step: 'fetch_blob',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +inputURI: string,
      +uri: string,
      +size: ?number,
      +mime: ?string,
    }
  | {
      +step: 'data_uri_from_blob',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +first255Chars: ?string,
    }
  | {
      +step: 'array_buffer_from_blob',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
    }
  | {
      +step: 'mime_check',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +mime: ?string,
    }
  | {
      +step: 'write_file',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +path: string,
      +length: number,
    }
  | FetchFileHashMediaMissionStep
  | CopyFileMediaMissionStep
  | EncryptFileMediaMissionStep
  | DecryptFileMediaMissionStep
  | GetOrientationMediaMissionStep
  | GenerateThumbhashMediaMissionStep
  | {
      +step: 'preload_resource',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +uri: string,
    }
  | {
      +step: 'preload_image',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +uri: string,
      +dimensions: ?Dimensions,
    }
  | {
      +step: 'reorient_image',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +uri: ?string,
    }
  | {
      +step: 'upload',
      +success: boolean,
      +exceptionMessage: ?string,
      +time: number, // ms
      +inputFilename: string,
      +outputMediaType: ?MediaType,
      +outputURI: ?string,
      +outputDimensions: ?Dimensions,
      +outputLoop: ?boolean,
      +hasWiFi?: boolean,
    }
  | {
      +step: 'wait_for_capture_uri_unload',
      +success: boolean,
      +time: number, // ms
      +uri: string,
    };

export type MediaMissionFailure =
  | {
      +success: false,
      +reason: 'no_file_path',
    }
  | {
      +success: false,
      +reason: 'file_stat_failed',
      +uri: string,
    }
  | {
      +success: false,
      +reason: 'photo_manipulation_failed',
      +size: number, // in bytes
    }
  | {
      +success: false,
      +reason: 'media_type_fetch_failed',
      +detectedMIME: ?string,
    }
  | {
      +success: false,
      +reason: 'mime_type_mismatch',
      +reportedMediaType: MediaType,
      +reportedMIME: string,
      +detectedMIME: string,
    }
  | {
      +success: false,
      +reason: 'http_upload_failed',
      +exceptionMessage: ?string,
    }
  | {
      +success: false,
      +reason: 'video_too_long',
      +duration: number, // in seconds
    }
  | {
      +success: false,
      +reason: 'video_probe_failed',
    }
  | {
      +success: false,
      +reason: 'video_transcode_failed',
    }
  | {
      +success: false,
      +reason: 'video_generate_thumbnail_failed',
    }
  | {
      +success: false,
      +reason: 'processing_exception',
      +time: number, // ms
      +exceptionMessage: ?string,
    }
  | {
      +success: false,
      +reason: 'encryption_exception',
      +time: number, // ms
      +exceptionMessage: ?string,
    }
  | {
      +success: false,
      +reason: 'save_unsupported',
    }
  | {
      +success: false,
      +reason: 'missing_permission',
    }
  | {
      +success: false,
      +reason: 'make_directory_failed',
    }
  | {
      +success: false,
      +reason: 'resolve_failed',
      +uri: string,
    }
  | {
      +success: false,
      +reason: 'save_to_library_failed',
      +uri: string,
    }
  | {
      +success: false,
      +reason: 'fetch_failed',
    }
  | {
      +success: false,
      +reason: 'data_uri_failed',
    }
  | {
      +success: false,
      +reason: 'array_buffer_failed',
    }
  | {
      +success: false,
      +reason: 'mime_check_failed',
      +mime: ?string,
    }
  | {
      +success: false,
      +reason: 'write_file_failed',
    }
  | {
      +success: false,
      +reason: 'fetch_file_hash_failed',
    }
  | {
      +success: false,
      +reason: 'copy_file_failed',
    }
  | {
      +success: false,
      +reason: 'exif_fetch_failed',
    }
  | {
      +success: false,
      +reason: 'reorient_image_failed',
    }
  | {
      +success: false,
      +reason: 'web_sibling_validation_failed',
    }
  | {
      +success: false,
      +reason: 'encryption_failed',
    }
  | { +success: false, +reason: 'digest_failed' }
  | { +success: false, +reason: 'thumbhash_failed' }
  | { +success: false, +reason: 'preload_image_failed' }
  | { +success: false, +reason: 'invalid_csat' }
  | DecryptionFailure;

export type DecryptionFailure = {
  +success: false,
  +reason: 'fetch_file_failed' | 'decrypt_data_failed' | 'write_file_failed',
  +exceptionMessage: ?string,
};

export type MediaMissionResult = MediaMissionFailure | { +success: true };

export type MediaMission = {
  +steps: $ReadOnlyArray<MediaMissionStep>,
  +result: MediaMissionResult,
  +userTime: number,
  +totalTime: number,
};

export type Image = {
  +id: string,
  +uri: string,
  +type: 'photo',
  +dimensions: Dimensions,
  +thumbHash: ?string,
  // stored on native only during creation in case retry needed after state lost
  +localMediaSelection?: NativeMediaSelection,
};

export const imageValidator: TInterface<Image> = tShape<Image>({
  id: tID,
  uri: t.String,
  type: tString('photo'),
  dimensions: dimensionsValidator,
  thumbHash: t.maybe(t.String),
  localMediaSelection: t.maybe(nativeMediaSelectionValidator),
});

type EncryptedImageCommons = {
  +id: string,
  +encryptionKey: string,
  +type: 'encrypted_photo',
  +dimensions: Dimensions,
  +thumbHash: ?string,
};
// old message formats (native codeVersion < 341) used holder
// new format uses blobURI. Effectively, they both mean blob URI
export type EncryptedImage =
  | { ...EncryptedImageCommons, +holder: string }
  | { ...EncryptedImageCommons, +blobURI: string };

const encryptedImageCommonsValidator = {
  id: tID,
  encryptionKey: t.String,
  type: tString('encrypted_photo'),
  dimensions: dimensionsValidator,
  thumbHash: t.maybe(t.String),
};

const encryptedImageValidator = t.union<EncryptedImage>([
  tShape({ ...encryptedImageCommonsValidator, holder: t.String }),
  tShape({ ...encryptedImageCommonsValidator, blobURI: t.String }),
]);

export type Video = {
  +id: string,
  +uri: string,
  +type: 'video',
  +dimensions: Dimensions,
  +loop?: boolean,
  +thumbnailID: string,
  +thumbnailURI: string,
  +thumbnailThumbHash: ?string,
  // stored on native only during creation in case retry needed after state lost
  +localMediaSelection?: NativeMediaSelection,
};

export const videoValidator: TInterface<Video> = tShape<Video>({
  id: tID,
  uri: t.String,
  type: tString('video'),
  dimensions: dimensionsValidator,
  loop: t.maybe(t.Boolean),
  thumbnailID: tID,
  thumbnailURI: t.String,
  thumbnailThumbHash: t.maybe(t.String),
  localMediaSelection: t.maybe(nativeMediaSelectionValidator),
});

type EncryptedVideoCommons = {
  +id: string,
  +encryptionKey: string,
  +type: 'encrypted_video',
  +dimensions: Dimensions,
  +loop?: boolean,
  +thumbnailID: string,
  +thumbnailEncryptionKey: string,
  +thumbnailThumbHash: ?string,
};
// old message formats (native codeVersion < 341) used holder
// new format uses blobURI. Effectively, they both mean blob URI
export type EncryptedVideo =
  | { ...EncryptedVideoCommons, +holder: string, +thumbnailHolder: string }
  | { ...EncryptedVideoCommons, +blobURI: string, +thumbnailBlobURI: string };

const encryptedVideoCommonsValidator = {
  id: tID,
  encryptionKey: t.String,
  type: tString('encrypted_video'),
  dimensions: dimensionsValidator,
  loop: t.maybe(t.Boolean),
  thumbnailID: tID,
  thumbnailEncryptionKey: t.String,
  thumbnailThumbHash: t.maybe(t.String),
};
const encryptedVideoValidator = t.union<EncryptedVideo>([
  tShape({
    ...encryptedVideoCommonsValidator,
    holder: t.String,
    thumbnailHolder: t.String,
  }),
  tShape({
    ...encryptedVideoCommonsValidator,
    blobURI: t.String,
    thumbnailBlobURI: t.String,
  }),
]);

export type Media = Image | Video | EncryptedImage | EncryptedVideo;
export type MediaShape =
  | Partial<Image>
  | Partial<Video>
  | Partial<EncryptedImage>
  | Partial<EncryptedVideo>;

export const mediaValidator: TUnion<Media> = t.union([
  imageValidator,
  videoValidator,
  encryptedImageValidator,
  encryptedVideoValidator,
]);

export type MultimediaUploadResult = {
  results: UploadMultimediaResult[],
};
