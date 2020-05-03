// @flow

import type { AppState } from '../redux/redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import type {
  UploadMultimediaResult,
  Media,
  MediaSelection,
  MediaMissionResult,
  MediaMission,
} from 'lib/types/media-types';
import {
  messageTypes,
  type RawMessageInfo,
  type RawMultimediaMessageInfo,
  type SendMessageResult,
  type SendMessagePayload,
  type RawImagesMessageInfo,
  type RawMediaMessageInfo,
  type RawTextMessageInfo,
} from 'lib/types/message-types';
import {
  type MediaMissionReportCreationRequest,
  reportTypes,
} from 'lib/types/report-types';
import type {
  FetchJSONOptions,
  FetchJSONServerResponse,
} from 'lib/utils/fetch-json';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import { createSelector } from 'reselect';
import * as Upload from 'react-native-background-upload';
import { Platform } from 'react-native';

import { connect } from 'lib/utils/redux-utils';
import {
  uploadMultimedia,
  updateMultimediaMessageMediaActionType,
  type MultimediaUploadCallbacks,
  type MultimediaUploadExtras,
} from 'lib/actions/upload-actions';
import {
  createLocalMessageActionType,
  sendMultimediaMessageActionTypes,
  sendMultimediaMessage,
  sendTextMessageActionTypes,
  sendTextMessage,
} from 'lib/actions/message-actions';
import { createMediaMessageInfo } from 'lib/shared/message-utils';
import { queueReportsActionType } from 'lib/actions/report-actions';
import { getConfig } from 'lib/utils/config';
import {
  createLoadingStatusSelector,
  combineLoadingStatuses,
} from 'lib/selectors/loading-selectors';
import { pathFromURI } from 'lib/utils/file-utils';
import { isStaff } from 'lib/shared/user-utils';
import { videoDurationLimit } from 'lib/utils/video-utils';
import { getMessageForException } from 'lib/utils/errors';

import {
  InputStateContext,
  type PendingMultimediaUploads,
} from './input-state';
import { processMedia } from '../media/media-utils';
import { displayActionResultModal } from '../navigation/action-result-modal';
import { disposeTempFile } from '../media/file-utils';

let nextLocalUploadID = 0;
function getNewLocalID() {
  return `localUpload${nextLocalUploadID++}`;
}

type SelectionWithID = {|
  selection: MediaSelection,
  localID: string,
|};
type CompletedUploads = { [localMessageID: string]: ?Set<string> };

type Props = {|
  children: React.Node,
  // Redux state
  viewerID: ?string,
  nextLocalID: number,
  messageStoreMessages: { [id: string]: RawMessageInfo },
  ongoingMessageCreation: boolean,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  uploadMultimedia: (
    multimedia: Object,
    extras: MultimediaUploadExtras,
    callbacks: MultimediaUploadCallbacks,
  ) => Promise<UploadMultimediaResult>,
  sendMultimediaMessage: (
    threadID: string,
    localID: string,
    mediaIDs: $ReadOnlyArray<string>,
  ) => Promise<SendMessageResult>,
  sendTextMessage: (
    threadID: string,
    localID: string,
    text: string,
  ) => Promise<SendMessageResult>,
|};
type State = {|
  pendingUploads: PendingMultimediaUploads,
|};
class InputStateContainer extends React.PureComponent<Props, State> {
  static propTypes = {
    children: PropTypes.node.isRequired,
    viewerID: PropTypes.string,
    nextLocalID: PropTypes.number.isRequired,
    messageStoreMessages: PropTypes.object.isRequired,
    ongoingMessageCreation: PropTypes.bool.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    uploadMultimedia: PropTypes.func.isRequired,
    sendMultimediaMessage: PropTypes.func.isRequired,
    sendTextMessage: PropTypes.func.isRequired,
  };
  state = {
    pendingUploads: {},
  };
  sendCallbacks: Array<() => void> = [];
  activeURIs = new Map();

  static getCompletedUploads(props: Props, state: State): CompletedUploads {
    const completedUploads = {};
    for (let localMessageID in state.pendingUploads) {
      const messagePendingUploads = state.pendingUploads[localMessageID];
      const rawMessageInfo = props.messageStoreMessages[localMessageID];
      if (!rawMessageInfo) {
        continue;
      }
      invariant(
        rawMessageInfo.type === messageTypes.IMAGES ||
          rawMessageInfo.type === messageTypes.MULTIMEDIA,
        `rawMessageInfo ${localMessageID} should be multimedia`,
      );

      const completed = [];
      let allUploadsComplete = true;
      for (let localUploadID in messagePendingUploads) {
        let media;
        for (let singleMedia of rawMessageInfo.media) {
          if (singleMedia.id === localUploadID) {
            media = singleMedia;
            break;
          }
        }
        if (media) {
          allUploadsComplete = false;
        } else {
          completed.push(localUploadID);
        }
      }

      if (allUploadsComplete) {
        completedUploads[localMessageID] = null;
      } else if (completed.length > 0) {
        completedUploads[localMessageID] = new Set(completed);
      }
    }
    return completedUploads;
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.props.viewerID !== prevProps.viewerID) {
      this.setState({ pendingUploads: {} });
      return;
    }

    const currentlyComplete = InputStateContainer.getCompletedUploads(
      this.props,
      this.state,
    );
    const previouslyComplete = InputStateContainer.getCompletedUploads(
      prevProps,
      prevState,
    );

    const newPendingUploads = {};
    let pendingUploadsChanged = false;
    const readyMessageIDs = [];
    for (let localMessageID in this.state.pendingUploads) {
      const messagePendingUploads = this.state.pendingUploads[localMessageID];
      const prevRawMessageInfo = prevProps.messageStoreMessages[localMessageID];
      const rawMessageInfo = this.props.messageStoreMessages[localMessageID];
      const completedUploadIDs = currentlyComplete[localMessageID];
      const previouslyCompletedUploadIDs = previouslyComplete[localMessageID];

      if (!rawMessageInfo && prevRawMessageInfo) {
        pendingUploadsChanged = true;
        continue;
      } else if (completedUploadIDs === null) {
        // All of this message's uploads have been completed
        newPendingUploads[localMessageID] = {};
        if (previouslyCompletedUploadIDs !== null) {
          readyMessageIDs.push(localMessageID);
          pendingUploadsChanged = true;
        }
        continue;
      } else if (!completedUploadIDs) {
        // Nothing has been completed
        newPendingUploads[localMessageID] = messagePendingUploads;
        continue;
      }

      const newUploads = {};
      let uploadsChanged = false;
      for (let localUploadID in messagePendingUploads) {
        if (!completedUploadIDs.has(localUploadID)) {
          newUploads[localUploadID] = messagePendingUploads[localUploadID];
        } else if (
          !previouslyCompletedUploadIDs ||
          !previouslyCompletedUploadIDs.has(localUploadID)
        ) {
          uploadsChanged = true;
        }
      }

      if (uploadsChanged) {
        pendingUploadsChanged = true;
        newPendingUploads[localMessageID] = newUploads;
      } else {
        newPendingUploads[localMessageID] = messagePendingUploads;
      }
    }
    if (pendingUploadsChanged) {
      this.setState({ pendingUploads: newPendingUploads });
    }

    for (let localMessageID of readyMessageIDs) {
      const rawMessageInfo = this.props.messageStoreMessages[localMessageID];
      if (!rawMessageInfo) {
        continue;
      }
      invariant(
        rawMessageInfo.type === messageTypes.IMAGES ||
          rawMessageInfo.type === messageTypes.MULTIMEDIA,
        `rawMessageInfo ${localMessageID} should be multimedia`,
      );
      this.dispatchMultimediaMessageAction(rawMessageInfo);
    }
  }

  dispatchMultimediaMessageAction(messageInfo: RawMultimediaMessageInfo) {
    this.props.dispatchActionPromise(
      sendMultimediaMessageActionTypes,
      this.sendMultimediaMessageAction(messageInfo),
      undefined,
      messageInfo,
    );
  }

  async sendMultimediaMessageAction(
    messageInfo: RawMultimediaMessageInfo,
  ): Promise<SendMessagePayload> {
    const { localID, threadID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );
    const mediaIDs = [];
    for (let { id } of messageInfo.media) {
      mediaIDs.push(id);
    }
    try {
      const result = await this.props.sendMultimediaMessage(
        threadID,
        localID,
        mediaIDs,
      );
      return {
        localID,
        serverID: result.id,
        threadID,
        time: result.time,
      };
    } catch (e) {
      e.localID = localID;
      e.threadID = threadID;
      throw e;
    }
  }

  inputStateSelector = createSelector(
    (state: State) => state.pendingUploads,
    (pendingUploads: PendingMultimediaUploads) => ({
      pendingUploads,
      sendTextMessage: this.sendTextMessage,
      sendMultimediaMessage: this.sendMultimediaMessage,
      messageHasUploadFailure: this.messageHasUploadFailure,
      retryMultimediaMessage: this.retryMultimediaMessage,
      registerSendCallback: this.registerSendCallback,
      unregisterSendCallback: this.unregisterSendCallback,
      uploadInProgress: this.uploadInProgress,
      reportURIDisplayed: this.reportURIDisplayed,
    }),
  );

  uploadInProgress = () => {
    if (this.props.ongoingMessageCreation) {
      return true;
    }
    for (let localMessageID in this.state.pendingUploads) {
      const messagePendingUploads = this.state.pendingUploads[localMessageID];
      for (let localUploadID in messagePendingUploads) {
        const { failed } = messagePendingUploads[localUploadID];
        if (!failed) {
          return true;
        }
      }
    }
    return false;
  };

  sendTextMessage = (messageInfo: RawTextMessageInfo) => {
    this.sendCallbacks.forEach(callback => callback());
    this.props.dispatchActionPromise(
      sendTextMessageActionTypes,
      this.sendTextMessageAction(messageInfo),
      undefined,
      messageInfo,
    );
  };

  async sendTextMessageAction(
    messageInfo: RawTextMessageInfo,
  ): Promise<SendMessagePayload> {
    try {
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
      );
      const result = await this.props.sendTextMessage(
        messageInfo.threadID,
        localID,
        messageInfo.text,
      );
      return {
        localID,
        serverID: result.id,
        threadID: messageInfo.threadID,
        time: result.time,
      };
    } catch (e) {
      e.localID = messageInfo.localID;
      e.threadID = messageInfo.threadID;
      throw e;
    }
  }

  sendMultimediaMessage = async (
    threadID: string,
    selections: $ReadOnlyArray<MediaSelection>,
  ) => {
    this.sendCallbacks.forEach(callback => callback());
    const localMessageID = `local${this.props.nextLocalID}`;
    const selectionsWithIDs = selections.map(selection => ({
      selection,
      localID: getNewLocalID(),
    }));

    const pendingUploads = {};
    for (let { localID } of selectionsWithIDs) {
      pendingUploads[localID] = {
        failed: null,
        progressPercent: 0,
      };
    }

    this.setState(
      prevState => {
        return {
          pendingUploads: {
            ...prevState.pendingUploads,
            [localMessageID]: pendingUploads,
          },
        };
      },
      () => {
        const creatorID = this.props.viewerID;
        invariant(creatorID, 'need viewer ID in order to send a message');
        const media = selectionsWithIDs.map(({ localID, selection }) => {
          if (selection.step === 'photo_library') {
            return {
              id: localID,
              uri: selection.uri,
              type: 'photo',
              dimensions: selection.dimensions,
              localMediaSelection: selection,
            };
          } else if (selection.step === 'photo_capture') {
            return {
              id: localID,
              uri: selection.uri,
              type: 'photo',
              dimensions: selection.dimensions,
              localMediaSelection: selection,
            };
          } else if (selection.step === 'video_library') {
            return {
              id: localID,
              uri: selection.uri,
              type: 'video',
              dimensions: selection.dimensions,
              localMediaSelection: selection,
              loop: false,
            };
          }
          invariant(false, `invalid selection ${JSON.stringify(selection)}`);
        });
        const messageInfo = createMediaMessageInfo({
          localID: localMessageID,
          threadID,
          creatorID,
          media,
        });
        this.props.dispatchActionPayload(
          createLocalMessageActionType,
          messageInfo,
        );
      },
    );

    await this.uploadFiles(localMessageID, selectionsWithIDs);
  };

  async uploadFiles(
    localMessageID: string,
    selectionsWithIDs: $ReadOnlyArray<SelectionWithID>,
  ) {
    const results = await Promise.all(
      selectionsWithIDs.map(selectionWithID =>
        this.uploadFile(localMessageID, selectionWithID),
      ),
    );
    const errors = [...new Set(results.filter(Boolean))];
    if (errors.length > 0) {
      displayActionResultModal(errors.join(', ') + ' :(');
    }
  }

  async uploadFile(
    localMessageID: string,
    selectionWithID: SelectionWithID,
  ): Promise<?string> {
    const { localID, selection } = selectionWithID;
    const start = selection.sendTime;
    let steps = [selection],
      serverID,
      userTime,
      errorMessage;
    let reportPromise;

    const finish = async (result: MediaMissionResult) => {
      if (reportPromise) {
        const finalSteps = await reportPromise;
        steps.push(...finalSteps);
      }
      const totalTime = Date.now() - start;
      userTime = userTime ? userTime : totalTime;
      this.queueMediaMissionReport(
        { localID, localMessageID, serverID },
        { steps, result, totalTime, userTime },
      );
      return errorMessage;
    };
    const fail = (message: string) => {
      errorMessage = message;
      this.handleUploadFailure(localMessageID, localID, message);
      userTime = Date.now() - start;
    };

    let processedMedia;
    const processingStart = Date.now();
    try {
      const processMediaReturn = processMedia(
        selection,
        this.mediaProcessConfig(),
      );
      reportPromise = processMediaReturn.reportPromise;
      const processResult = await processMediaReturn.resultPromise;
      if (!processResult.success) {
        const message =
          processResult.reason === 'video_too_long'
            ? `can't do vids longer than ${videoDurationLimit}min`
            : 'processing failed';
        fail(message);
        return await finish(processResult);
      }
      processedMedia = processResult;
    } catch (e) {
      const exceptionMessage = getMessageForException(e);
      const time = Date.now() - processingStart;
      steps.push({
        step: 'processing_exception',
        time,
        exceptionMessage,
      });
      fail('processing failed');
      return await finish({
        success: false,
        reason: 'processing_exception',
        time,
        exceptionMessage,
      });
    }

    const { uploadURI, shouldDisposePath, filename, mime } = processedMedia;

    const uploadStart = Date.now();
    let uploadExceptionMessage, uploadResult, mediaMissionResult;
    try {
      uploadResult = await this.props.uploadMultimedia(
        { uri: uploadURI, name: filename, type: mime },
        { ...processedMedia.dimensions, loop: processedMedia.loop },
        {
          onProgress: (percent: number) =>
            this.setProgress(localMessageID, localID, percent),
          uploadBlob: this.uploadBlob,
        },
      );
      mediaMissionResult = { success: true };
    } catch (e) {
      uploadExceptionMessage = getMessageForException(e);
      fail('upload failed');
      mediaMissionResult = {
        success: false,
        reason: 'http_upload_failed',
        exceptionMessage: uploadExceptionMessage,
      };
    }

    if (uploadResult) {
      const { id, mediaType, uri, dimensions, loop } = uploadResult;
      serverID = id;
      this.props.dispatchActionPayload(updateMultimediaMessageMediaActionType, {
        messageID: localMessageID,
        currentMediaID: localID,
        mediaUpdate: {
          id,
          type: mediaType,
          uri,
          dimensions,
          localMediaSelection: undefined,
          loop,
        },
      });
      userTime = Date.now() - start;
    }

    const processSteps = await reportPromise;
    reportPromise = null;
    steps.push(...processSteps);
    steps.push({
      step: 'upload',
      success: !!uploadResult,
      exceptionMessage: uploadExceptionMessage,
      filename,
      time: Date.now() - uploadStart,
    });

    const promises = [];

    if (shouldDisposePath) {
      promises.push(
        (async () => {
          const disposeStep = await disposeTempFile(shouldDisposePath);
          steps.push(disposeStep);
        })(),
      );
    }

    if (selection.captureTime) {
      const captureURI = selection.uri;
      promises.push(
        (async () => {
          const {
            steps: clearSteps,
            result: capturePath,
          } = await this.waitForCaptureURIUnload(captureURI);
          steps.push(...clearSteps);
          if (!capturePath) {
            return;
          }
          const disposeStep = await disposeTempFile(capturePath);
          steps.push(disposeStep);
        })(),
      );
    }

    await Promise.all(promises);

    return await finish(mediaMissionResult);
  }

  mediaProcessConfig() {
    const { viewerID } = this.props;
    if (__DEV__ || (viewerID && isStaff(viewerID))) {
      return {
        finalFileHeaderCheck: true,
      };
    }
    return {};
  }

  setProgress(
    localMessageID: string,
    localUploadID: string,
    progressPercent: number,
  ) {
    this.setState(prevState => {
      const pendingUploads = prevState.pendingUploads[localMessageID];
      if (!pendingUploads) {
        return {};
      }
      const pendingUpload = pendingUploads[localUploadID];
      if (!pendingUpload) {
        return {};
      }
      const newOutOfHundred = Math.floor(progressPercent * 100);
      const oldOutOfHundred = Math.floor(pendingUpload.progressPercent * 100);
      if (newOutOfHundred === oldOutOfHundred) {
        return {};
      }
      const newPendingUploads = {
        ...pendingUploads,
        [localUploadID]: {
          ...pendingUpload,
          progressPercent,
        },
      };
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [localMessageID]: newPendingUploads,
        },
      };
    });
  }

  uploadBlob = async (
    url: string,
    cookie: ?string,
    sessionID: ?string,
    input: { [key: string]: mixed },
    options?: ?FetchJSONOptions,
  ): Promise<FetchJSONServerResponse> => {
    invariant(
      cookie &&
        input.multimedia &&
        Array.isArray(input.multimedia) &&
        input.multimedia.length === 1 &&
        input.multimedia[0] &&
        typeof input.multimedia[0] === 'object',
      'InputStateContainer.uploadBlob sent incorrect input',
    );
    const { uri, name, type } = input.multimedia[0];
    invariant(
      typeof uri === 'string' &&
        typeof name === 'string' &&
        typeof type === 'string',
      'InputStateContainer.uploadBlob sent incorrect input',
    );

    const parameters = {};
    parameters.cookie = cookie;
    parameters.filename = name;

    for (let key in input) {
      if (
        key === 'multimedia' ||
        key === 'cookie' ||
        key === 'sessionID' ||
        key === 'filename'
      ) {
        continue;
      }
      const value = input[key];
      invariant(
        typeof value === 'string',
        'blobUpload calls can only handle string values for non-multimedia keys',
      );
      parameters[key] = value;
    }

    let path = uri;
    if (Platform.OS === 'android') {
      const resolvedPath = pathFromURI(uri);
      if (resolvedPath) {
        path = resolvedPath;
      }
    }
    const uploadID = await Upload.startUpload({
      url,
      path,
      type: 'multipart',
      headers: {
        Accept: 'application/json',
      },
      field: 'multimedia',
      parameters,
    });
    if (options && options.abortHandler) {
      options.abortHandler(() => {
        Upload.cancelUpload(uploadID);
      });
    }
    return await new Promise((resolve, reject) => {
      Upload.addListener('error', uploadID, data => {
        reject(data.error);
      });
      Upload.addListener('cancelled', uploadID, () => {
        reject(new Error('request aborted'));
      });
      Upload.addListener('completed', uploadID, data => {
        resolve(JSON.parse(data.responseBody));
      });
      if (options && options.onProgress) {
        const { onProgress } = options;
        Upload.addListener('progress', uploadID, data =>
          onProgress(data.progress / 100),
        );
      }
    });
  };

  handleUploadFailure(
    localMessageID: string,
    localUploadID: string,
    message: string,
  ) {
    this.setState(prevState => {
      const uploads = prevState.pendingUploads[localMessageID];
      const upload = uploads[localUploadID];
      if (!upload) {
        // The upload has been completed before it failed
        return {};
      }
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [localMessageID]: {
            ...uploads,
            [localUploadID]: {
              ...upload,
              failed: message,
              progressPercent: 0,
            },
          },
        },
      };
    });
  }

  queueMediaMissionReport(
    ids: {| localID: string, localMessageID: string, serverID: ?string |},
    mediaMission: MediaMission,
  ) {
    const report: MediaMissionReportCreationRequest = {
      type: reportTypes.MEDIA_MISSION,
      time: Date.now(),
      platformDetails: getConfig().platformDetails,
      mediaMission,
      uploadServerID: ids.serverID,
      uploadLocalID: ids.localID,
      messageLocalID: ids.localMessageID,
    };
    this.props.dispatchActionPayload(queueReportsActionType, {
      reports: [report],
    });
  }

  messageHasUploadFailure = (localMessageID: string) => {
    const pendingUploads = this.state.pendingUploads[localMessageID];
    if (!pendingUploads) {
      return false;
    }
    for (let localUploadID in pendingUploads) {
      const { failed } = pendingUploads[localUploadID];
      if (failed) {
        return true;
      }
    }
    return false;
  };

  retryMultimediaMessage = async (localMessageID: string) => {
    const rawMessageInfo = this.props.messageStoreMessages[localMessageID];
    invariant(rawMessageInfo, `rawMessageInfo ${localMessageID} should exist`);

    let pendingUploads = this.state.pendingUploads[localMessageID];
    if (!pendingUploads) {
      pendingUploads = {};
    }

    const now = Date.now();

    const updateMedia = <T: Media>(media: $ReadOnlyArray<T>): T[] =>
      media.map(singleMedia => {
        const oldID = singleMedia.id;
        if (!oldID.startsWith('localUpload')) {
          // already uploaded
          return singleMedia;
        }
        if (pendingUploads[oldID] && !pendingUploads[oldID].failed) {
          // still being uploaded
          return singleMedia;
        }

        // If we have an incomplete upload that isn't in pendingUploads, that
        // indicates the app has restarted. We'll reassign a new localID to
        // avoid collisions. Note that this isn't necessary for the message ID
        // since the localID reducer prevents collisions there
        const id = pendingUploads[oldID] ? oldID : getNewLocalID();

        const oldSelection = singleMedia.localMediaSelection;
        invariant(
          oldSelection,
          'localMediaSelection should be set on locally created Media',
        );
        const retries = oldSelection.retries ? oldSelection.retries + 1 : 1;

        // We switch for Flow
        let selection;
        if (oldSelection.step === 'photo_capture') {
          selection = { ...oldSelection, sendTime: now, retries };
        } else if (oldSelection.step === 'photo_library') {
          selection = { ...oldSelection, sendTime: now, retries };
        } else {
          selection = { ...oldSelection, sendTime: now, retries };
        }

        if (singleMedia.type === 'photo') {
          return {
            type: 'photo',
            ...singleMedia,
            id,
            localMediaSelection: selection,
          };
        } else {
          return {
            type: 'video',
            ...singleMedia,
            id,
            localMediaSelection: selection,
          };
        }
      });

    let newRawMessageInfo;
    // This conditional is for Flow
    if (rawMessageInfo.type === messageTypes.MULTIMEDIA) {
      newRawMessageInfo = ({
        ...rawMessageInfo,
        time: now,
        media: updateMedia(rawMessageInfo.media),
      }: RawMediaMessageInfo);
    } else if (rawMessageInfo.type === messageTypes.IMAGES) {
      newRawMessageInfo = ({
        ...rawMessageInfo,
        time: now,
        media: updateMedia(rawMessageInfo.media),
      }: RawImagesMessageInfo);
    } else {
      invariant(false, `rawMessageInfo ${localMessageID} should be multimedia`);
    }

    const incompleteMedia: Media[] = [];
    for (let singleMedia of newRawMessageInfo.media) {
      if (singleMedia.id.startsWith('localUpload')) {
        incompleteMedia.push(singleMedia);
      }
    }
    if (incompleteMedia.length === 0) {
      this.dispatchMultimediaMessageAction(newRawMessageInfo);
      this.setState(prevState => ({
        pendingUploads: {
          ...prevState.pendingUploads,
          [localMessageID]: {},
        },
      }));
      return;
    }

    const retryMedia = incompleteMedia.filter(
      ({ id }) => !pendingUploads[id] || pendingUploads[id].failed,
    );
    if (retryMedia.length === 0) {
      // All media are already in the process of being uploaded
      return;
    }

    // We're not actually starting the send here,
    // we just use this action to update the message in Redux
    this.props.dispatchActionPayload(
      sendMultimediaMessageActionTypes.started,
      newRawMessageInfo,
    );

    // We clear out the failed status on individual media here,
    // which makes the UI show pending status instead of error messages
    for (let { id } of retryMedia) {
      pendingUploads[id] = {
        failed: null,
        progressPercent: 0,
      };
    }
    this.setState(prevState => ({
      pendingUploads: {
        ...prevState.pendingUploads,
        [localMessageID]: pendingUploads,
      },
    }));

    const selectionsWithIDs = retryMedia.map(singleMedia => {
      const { id, localMediaSelection } = singleMedia;
      invariant(
        localMediaSelection,
        'localMediaSelection should be set on locally created Media',
      );
      return { selection: localMediaSelection, localID: id };
    });

    await this.uploadFiles(localMessageID, selectionsWithIDs);
  };

  registerSendCallback = (callback: () => void) => {
    this.sendCallbacks.push(callback);
  };

  unregisterSendCallback = (callback: () => void) => {
    this.sendCallbacks = this.sendCallbacks.filter(
      candidate => candidate !== callback,
    );
  };

  reportURIDisplayed = (uri: string, loaded: boolean) => {
    const prevActiveURI = this.activeURIs.get(uri);
    const curCount = prevActiveURI && prevActiveURI.count;
    const prevCount = curCount ? curCount : 0;
    const count = loaded ? prevCount + 1 : prevCount - 1;
    const prevOnClear = prevActiveURI && prevActiveURI.onClear;
    const onClear = prevOnClear ? prevOnClear : [];
    const activeURI = { count, onClear };
    if (count) {
      this.activeURIs.set(uri, activeURI);
      return;
    }
    this.activeURIs.delete(uri);
    for (let callback of onClear) {
      callback();
    }
  };

  waitForCaptureURIUnload(uri: string) {
    const start = Date.now();
    const path = pathFromURI(uri);
    if (!path) {
      return Promise.resolve({
        result: null,
        steps: [
          {
            step: 'wait_for_capture_uri_unload',
            success: false,
            time: Date.now() - start,
            uri,
          },
        ],
      });
    }

    const getResult = () => ({
      result: path,
      steps: [
        {
          step: 'wait_for_capture_uri_unload',
          success: true,
          time: Date.now() - start,
          uri,
        },
      ],
    });

    const activeURI = this.activeURIs.get(uri);
    if (!activeURI) {
      return Promise.resolve(getResult());
    }

    return new Promise(resolve => {
      const finish = () => resolve(getResult());
      const newActiveURI = {
        ...activeURI,
        onClear: [...activeURI.onClear, finish],
      };
      this.activeURIs.set(uri, newActiveURI);
    });
  }

  render() {
    const inputState = this.inputStateSelector(this.state);
    return (
      <InputStateContext.Provider value={inputState}>
        {this.props.children}
      </InputStateContext.Provider>
    );
  }
}

const mediaCreationLoadingStatusSelector = createLoadingStatusSelector(
  sendMultimediaMessageActionTypes,
);
const textCreationLoadingStatusSelector = createLoadingStatusSelector(
  sendTextMessageActionTypes,
);

export default connect(
  (state: AppState) => ({
    viewerID: state.currentUserInfo && state.currentUserInfo.id,
    nextLocalID: state.nextLocalID,
    messageStoreMessages: state.messageStore.messages,
    ongoingMessageCreation:
      combineLoadingStatuses(
        mediaCreationLoadingStatusSelector(state),
        textCreationLoadingStatusSelector(state),
      ) === 'loading',
  }),
  { uploadMultimedia, sendMultimediaMessage, sendTextMessage },
)(InputStateContainer);
