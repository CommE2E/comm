// @flow

import type { PendingMultimediaUploads } from './chat-input-state';
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
} from 'lib/types/message-types';
import {
  type MediaMissionReportCreationRequest,
  reportTypes,
} from 'lib/types/report-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import { createSelector } from 'reselect';
import filesystem from 'react-native-fs';

import { connect } from 'lib/utils/redux-utils';
import {
  uploadMultimedia,
  updateMultimediaMessageMediaActionType,
} from 'lib/actions/upload-actions';
import {
  createLocalMessageActionType,
  sendMultimediaMessageActionTypes,
  sendMultimediaMessage,
} from 'lib/actions/message-actions';
import { createMediaMessageInfo } from 'lib/shared/message-utils';
import { queueReportsActionType } from 'lib/actions/report-actions';
import { getConfig } from 'lib/utils/config';

import { ChatInputStateContext } from './chat-input-state';
import { processMedia } from '../utils/media-utils';
import { displayActionResultModal } from '../navigation/action-result-modal';

let nextLocalUploadID = 0;
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
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  uploadMultimedia: (
    multimedia: Object,
    onProgress: (percent: number) => void,
    abortHandler?: (abort: () => void) => void,
  ) => Promise<UploadMultimediaResult>,
  sendMultimediaMessage: (
    threadID: string,
    localID: string,
    mediaIDs: $ReadOnlyArray<string>,
  ) => Promise<SendMessageResult>,
|};
type State = {|
  pendingUploads: PendingMultimediaUploads,
|};
class ChatInputStateContainer extends React.PureComponent<Props, State> {

  static propTypes = {
    children: PropTypes.node.isRequired,
    viewerID: PropTypes.string,
    nextLocalID: PropTypes.number.isRequired,
    messageStoreMessages: PropTypes.object.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    uploadMultimedia: PropTypes.func.isRequired,
    sendMultimediaMessage: PropTypes.func.isRequired,
  };
  state = {
    pendingUploads: {},
  };

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

    const currentlyComplete = ChatInputStateContainer.getCompletedUploads(
      this.props,
      this.state,
    );
    const previouslyComplete = ChatInputStateContainer.getCompletedUploads(
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

      const numNewUploads = Object.keys(newUploads).length;
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
      "localID should be set",
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

  chatInputStateSelector = createSelector(
    (state: State) => state.pendingUploads,
    (pendingUploads: PendingMultimediaUploads) => ({
      pendingUploads,
      sendMultimediaMessage: this.sendMultimediaMessage,
      messageHasUploadFailure: this.messageHasUploadFailure,
      retryMultimediaMessage: this.retryMultimediaMessage,
    }),
  );

  sendMultimediaMessage = async (
    threadID: string,
    selections: $ReadOnlyArray<MediaSelection>,
  ) => {
    const localMessageID = `local${this.props.nextLocalID}`;
    const selectionsWithIDs = selections.map(selection => ({
      selection,
      localID: `localUpload${nextLocalUploadID++}`,
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
        invariant(creatorID, "need viewer ID in order to send a message");
        const media = selectionsWithIDs.map(
          ({ localID, selection }) => {
            if (selection.step === "photo_library") {
              return {
                id: localID,
                uri: selection.uri,
                type: "photo",
                dimensions: selection.dimensions,
                localMediaSelection: selection,
              };
            } else if (selection.step === "photo_capture") {
              return {
                id: localID,
                uri: selection.uri,
                type: "photo",
                dimensions: selection.dimensions,
                localMediaSelection: selection,
              };
            } else if (selection.step === "video_library") {
              return {
                id: localID,
                uri: selection.uri,
                type: "video",
                dimensions: selection.dimensions,
                localMediaSelection: selection,
              };
            }
            invariant(
              false,
              `invalid selection ${JSON.stringify(selection)}`,
            );
          },
        );
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
  }

  async uploadFiles(
    localMessageID: string,
    selectionsWithIDs: $ReadOnlyArray<SelectionWithID>,
  ) {
    const results = await Promise.all(
      selectionsWithIDs.map(selectionWithID => this.uploadFile(
        localMessageID,
        selectionWithID,
      )),
    );
    const errors = [ ...new Set(results.filter(Boolean)) ];
    if (errors.length > 0) {
      displayActionResultModal(errors.join(", ") + " :(");
    }
  }

  async uploadFile(
    localMessageID: string,
    selectionWithID: SelectionWithID,
  ): Promise<?string> {
    const start = Date.now();

    const { localID, selection } = selectionWithID;
    let steps = [ selection ], serverID;
    const finish = (result: MediaMissionResult, errorMessage: ?string) => {
      if (errorMessage) {
        this.handleUploadFailure(localMessageID, localID, errorMessage);
      }
      this.queueMediaMissionReport(
        { localID, localMessageID, serverID },
        { steps, result },
      );
      return errorMessage;
    };

    let mediaInfo;
    if (selection.step === "photo_library") {
      mediaInfo = {
        type: "photo",
        uri: selection.uri,
        dimensions: selection.dimensions,
        filename: selection.filename,
      };
    } else if (selection.step === "photo_capture") {
      mediaInfo = {
        type: "photo",
        uri: selection.uri,
        dimensions: selection.dimensions,
        filename: selection.filename,
      };
    } else if (selection.step === "video_library") {
      mediaInfo = {
        type: "video",
        uri: selection.uri,
        dimensions: selection.dimensions,
        filename: selection.filename,
      };
    } else {
      invariant(
        false,
        `invalid selection ${JSON.stringify(selection)}`,
      );
    }

    let processedMedia;
    const processingStart = Date.now();
    try {
      const {
        result: processResult,
        steps: processSteps,
      } = await processMedia(mediaInfo);
      steps = [ ...steps, ...processSteps ];
      if (!processResult.success) {
        return finish(processResult, "processing failed");
      }
      processedMedia = processResult;
    } catch (e) {
      const message = (e && e.message) ? e.message : "processing threw";
      const time = Date.now() - processingStart;
      steps.push({ step: "processing_exception", time, message });
      return finish(
        { success: false, reason: "processing_exception", time, message },
        message,
      );
    }

    const {
      uploadURI,
      shouldDisposePath,
      name,
      mime,
      mediaType,
    } = processedMedia;

    const uploadStart = Date.now();
    let uploadResult, message, mediaMissionResult;
    try {
      uploadResult = await this.props.uploadMultimedia(
        { uri: uploadURI, name, type: mime },
        (percent: number) => this.setProgress(
          localMessageID,
          localID,
          percent,
        ),
      );
      mediaMissionResult = { success: true, totalTime: Date.now() - start };
    } catch (e) {
      message = "upload failed";
      mediaMissionResult = {
        success: false,
        reason: "http_upload_failed",
        message: (e && e.message) ? e.message : undefined,
      };
    }
    if (uploadResult) {
      serverID = uploadResult.id;
      this.props.dispatchActionPayload(
        updateMultimediaMessageMediaActionType,
        {
          messageID: localMessageID,
          currentMediaID: localID,
          mediaUpdate: {
            id: serverID,
            uri: uploadResult.uri,
            type: mediaType,
            dimensions: processedMedia.dimensions,
            localMediaCreationInfo: undefined,
          },
        },
      );
    }
    steps.push({
      step: "upload",
      success: !!uploadResult,
      time: Date.now() - uploadStart,
    });

    if (!shouldDisposePath) {
      return finish(mediaMissionResult, message);
    }
    let disposeSuccess = false;
    const disposeStart = Date.now();
    try {
      await filesystem.unlink(shouldDisposePath);
      disposeSuccess = true;
    } catch (e) { }
    steps.push({
      step: "dispose_uploaded_local_file",
      success: disposeSuccess,
      time: disposeStart - Date.now(),
      path: shouldDisposePath,
    });
    return finish(mediaMissionResult, message);
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
      mediaLocalID: ids.localMessageID,
    };
    this.props.dispatchActionPayload(
      queueReportsActionType,
      { reports: [ report ] },
    );
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
  }

  retryMultimediaMessage = async (localMessageID: string) => {
    const rawMessageInfo = this.props.messageStoreMessages[localMessageID];
    invariant(
      rawMessageInfo,
      `rawMessageInfo ${localMessageID} should exist`,
    );
    let newRawMessageInfo;
    // This conditional is for Flow
    if (rawMessageInfo.type === messageTypes.MULTIMEDIA) {
      newRawMessageInfo = ({
        ...rawMessageInfo,
        time: Date.now(),
      }: RawMediaMessageInfo);
    } else if (rawMessageInfo.type === messageTypes.IMAGES) {
      newRawMessageInfo = ({
        ...rawMessageInfo,
        time: Date.now(),
      }: RawImagesMessageInfo);
    } else {
      invariant(
        false,
        `rawMessageInfo ${localMessageID} should be multimedia`,
      );
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

    let pendingUploads = this.state.pendingUploads[localMessageID];
    if (!pendingUploads) {
      pendingUploads = {};
    }

    const retryMedia = incompleteMedia.filter(
      ({ id }) => (!pendingUploads[id] || pendingUploads[id].failed),
    );
    if (retryMedia.length === 0) {
      // All media are already in the process of being uploaded
      return;
    }

    // We're not actually starting the send here,
    // we just use this action to update the message's timestamp in Redux
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
        "localMediaSelection should be set on locally created Media",
      );
      return { selection: localMediaSelection, localID: id };
    });

    await this.uploadFiles(localMessageID, selectionsWithIDs);
  }

  render() {
    const chatInputState = this.chatInputStateSelector(this.state);
    return (
      <ChatInputStateContext.Provider value={chatInputState}>
        {this.props.children}
      </ChatInputStateContext.Provider>
    );
  }

}

export default connect(
  (state: AppState) => ({
    viewerID: state.currentUserInfo && state.currentUserInfo.id,
    nextLocalID: state.nextLocalID,
    messageStoreMessages: state.messageStore.messages,
  }),
  { uploadMultimedia, sendMultimediaMessage },
)(ChatInputStateContainer);
