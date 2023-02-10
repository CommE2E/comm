// @flow

import type { Shape } from './core.js';
import { type Platform } from './device-types.js';

export type Dimensions = $ReadOnly<{
  +height: number,
  +width: number,
}>;

export type MediaType = 'photo' | 'video';

export type Image = {
  +id: string,
  +uri: string,
  +type: 'photo',
  +dimensions: Dimensions,
  // stored on native only during creation in case retry needed after state lost
  +localMediaSelection?: NativeMediaSelection,
};

export type Video = {
  +id: string,
  +uri: string,
  +type: 'video',
  +dimensions: Dimensions,
  +loop?: boolean,
  +thumbnailID: string,
  +thumbnailURI: string,
  // stored on native only during creation in case retry needed after state lost
  +localMediaSelection?: NativeMediaSelection,
};

export type Media = Image | Video;

export type ClientDBMediaInfo = {
  +id: string,
  +uri: string,
  +type: 'photo' | 'video',
  +extras: string,
};

export type Corners = Shape<{
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
    };

export type UploadMultimediaResult = {
  +id: string,
  +uri: string,
  +dimensions: Dimensions,
  +mediaType: MediaType,
  +loop: boolean,
};

export type UpdateMultimediaMessageMediaPayload = {
  +messageID: string,
  +currentMediaID: string,
  +mediaUpdate: Shape<Media>,
};

export type UploadDeletionRequest = {
  +id: string,
};

export type FFmpegStatistics = {
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
};

export type TranscodeVideoMediaMissionStep = {
  +step: 'video_ffmpeg_transcode',
  +success: boolean,
  +exceptionMessage: ?string,
  +time: number, // ms
  +returnCode: ?number,
  +newPath: ?string,
  +stats: ?FFmpegStatistics,
};

export type VideoGenerateThumbnailMediaMissionStep = {
  +step: 'video_generate_thumbnail',
  +success: boolean,
  +time: number, // ms
  +returnCode: number,
  +thumbnailURI: string,
};

export type VideoInfo = {
  +codec: ?string,
  +dimensions: ?Dimensions,
  +duration: number, // seconds
  +format: $ReadOnlyArray<string>,
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
  +format: ?$ReadOnlyArray<string>,
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

export type PhotoPaste = {
  +step: 'photo_paste',
  +dimensions: Dimensions,
  +filename: string,
  +uri: string,
  +selectTime: number, // ms timestamp
  +sendTime: number, // ms timestamp
  +retries: number,
};

export type NativeMediaSelection =
  | MediaLibrarySelection
  | PhotoCapture
  | PhotoPaste;

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
  | GetOrientationMediaMissionStep
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
    };

export type MediaMissionResult = MediaMissionFailure | { +success: true };

export type MediaMission = {
  +steps: $ReadOnlyArray<MediaMissionStep>,
  +result: MediaMissionResult,
  +userTime: number,
  +totalTime: number,
};
