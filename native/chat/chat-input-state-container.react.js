// @flow

import type {
  PendingMultimediaUploads,
  ClientImageInfo,
} from './chat-input-state';
import type { AppState } from '../redux/redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import type { UploadMultimediaResult } from 'lib/types/media-types';
import {
  messageTypes,
  type RawMessageInfo,
  type RawMultimediaMessageInfo,
  type SendMessageResult,
  type SendMessagePayload,
  type RawImagesMessageInfo,
  type RawMediaMessageInfo,
} from 'lib/types/message-types';
import type { MediaValidationResult } from '../utils/media-utils';

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
import { pathFromURI } from 'lib/utils/file-utils';
import { createMediaMessageInfo } from 'lib/shared/message-utils';

import { ChatInputStateContext } from './chat-input-state';
import { validateMedia, convertMedia } from '../utils/media-utils';

let nextLocalUploadID = 0;
type MediaInfo = {|
  validationResult: MediaValidationResult,
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
  pendingUnlinkURIs = new Set();

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
      clearURI: this.clearURI,
    }),
  );

  sendMultimediaMessage = async (
    threadID: string,
    inputImageInfos: $ReadOnlyArray<ClientImageInfo>,
  ) => {
    const urisToUnlink = new Set(
      inputImageInfos.filter(
        inputImageInfo => !!inputImageInfo.unlinkURIAfterRemoving,
      ).map(inputImageInfo => inputImageInfo.uri),
    );

    const validationResults = await Promise.all(
      inputImageInfos.map(validateMedia),
    );
    const mediaInfos = validationResults.filter(Boolean).map(
      validationResult => ({
        validationResult,
        localID: `localUpload${nextLocalUploadID++}`,
      }),
    );
    const localMessageID = `local${this.props.nextLocalID}`;

    if (mediaInfos.length < validationResults.length) {
      // Since we filter our MIME types in our calls to CameraRoll,
      // this should never be triggered
      console.log('unexpected MIME type found');
    }
    if (mediaInfos.length === 0) {
      return;
    }

    const pendingUploads = {};
    for (let { localID, validationResult: { uri } } of mediaInfos) {
      pendingUploads[localID] = {
        failed: null,
        progressPercent: 0,
      };
      if (urisToUnlink.has(uri)) {
        this.pendingUnlinkURIs.add(uri);
      }
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
        const media = mediaInfos.map(
          ({ localID, validationResult }) => {
            // This conditional is for Flow
            if (validationResult.mediaType === "photo") {
              const { uri, dimensions, mediaType } = validationResult;
              return {
                id: localID,
                uri,
                type: "photo",
                dimensions,
              };
            } else {
              const { uri, dimensions, mediaType, filename } = validationResult;
              return {
                id: localID,
                uri,
                type: "video",
                dimensions,
                filename,
              };
            }
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

    await this.uploadFiles(localMessageID, mediaInfos);
  }

  uploadFiles(
    localMessageID: string,
    mediaInfos: $ReadOnlyArray<MediaInfo>,
  ) {
    return Promise.all(
      mediaInfos.map(mediaInfo => this.uploadFile(localMessageID, mediaInfo)),
    );
  }

  async uploadFile(localMessageID: string, mediaInfo: MediaInfo) {
    const { localID, validationResult } = mediaInfo;
    const conversionResult = await convertMedia(validationResult);
    if (!conversionResult) {
      this.handleUploadFailure(
        localMessageID,
        localID,
        new Error("conversion failed"),
      );
      return;
    }
    const {
      uploadURI,
      shouldDisposePath,
      name,
      mime,
      mediaType,
    } = conversionResult;

    let result;
    try {
      result = await this.props.uploadMultimedia(
        { uri: uploadURI, name, type: mime },
        (percent: number) => this.setProgress(
          localMessageID,
          localID,
          percent,
        ),
      );
    } catch (e) {
      this.handleUploadFailure(localMessageID, localID, e);
    }
    if (result) {
      this.props.dispatchActionPayload(
        updateMultimediaMessageMediaActionType,
        {
          messageID: localMessageID,
          currentMediaID: localID,
          mediaUpdate: {
            id: result.id,
            uri: result.uri,
            type: mediaType,
            dimensions: conversionResult.dimensions,
            filename: undefined,
          },
        },
      );
    }
    if (!shouldDisposePath) {
      return;
    }
    try {
      await filesystem.unlink(shouldDisposePath);
    } catch (e) { }
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
    e: any,
  ) {
    this.setState(prevState => {
      const uploads = prevState.pendingUploads[localMessageID];
      const upload = uploads[localUploadID];
      if (!upload) {
        // The upload has been completed before it failed
        return {};
      }
      const failed = (e instanceof Error && e.message)
        ? e.message
        : "failed";
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [localMessageID]: {
            ...uploads,
            [localUploadID]: {
              ...upload,
              failed,
              progressPercent: 0,
            },
          },
        },
      };
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

    const incompleteMedia = [];
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

    const imageGalleryImages = retryMedia.map(singleMedia => {
      if (singleMedia.type === "photo") {
        const { dimensions, uri } = singleMedia;
        return { type: "photo", ...dimensions, uri };
      } else {
        const { dimensions, uri, filename } = singleMedia;
        return { type: "video", ...dimensions, uri, filename };
      }
    });
    const validationResults = await Promise.all(
      imageGalleryImages.map(validateMedia),
    );

    const mediaInfos = [];
    const newPendingUploads = {};
    for (let i = 0; i < validationResults.length; i++) {
      const result = validationResults[i];
      const { id } = retryMedia[i];
      if (!result) {
        newPendingUploads[id] = {
          failed: "validation",
          progressPercent: 0,
        };
        continue;
      }
      mediaInfos.push({
        validationResult: result,
        localID: id,
      });
    }
    if (mediaInfos.length < validationResults.length) {
      // Since we filter our MIME types in our calls to CameraRoll,
      // this should never be triggered
      console.log('unexpected MIME type found');
    }
    if (Object.keys(newPendingUploads).length > 0) {
      this.setState(prevState => ({
        pendingUploads: {
          ...prevState.pendingUploads,
          [localMessageID]: {
            ...prevState.pendingUploads[localMessageID],
            ...newPendingUploads,
          },
        },
      }));
    }

    if (mediaInfos.length > 0) {
      await this.uploadFiles(localMessageID, mediaInfos);
    }
  }

  clearURI = async (uri: string) => {
    if (!this.pendingUnlinkURIs.has(uri)) {
      return;
    }
    this.pendingUnlinkURIs.delete(uri);
    const path = pathFromURI(uri);
    if (!path) {
      return;
    }
    try {
      await filesystem.unlink(path);
    } catch (e) { }
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
