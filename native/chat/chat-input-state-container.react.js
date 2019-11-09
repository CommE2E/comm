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
  createLocalMultimediaMessageActionType,
  sendMultimediaMessageActionTypes,
  sendMultimediaMessage,
} from 'lib/actions/message-actions';

import { ChatInputStateContext } from './chat-input-state';
import { validateMedia, convertMedia, pathFromURI } from '../utils/media-utils';

let nextLocalUploadID = 0;
type ImageInfo = {|
  ...$Exact<MediaValidationResult>,
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
        rawMessageInfo.type === messageTypes.MULTIMEDIA,
        `${localMessageID} should be messageTypes.MULTIMEDIA`,
      );

      const completed = [];
      let allUploadsComplete = true;
      for (let localUploadID in messagePendingUploads) {
        const media = rawMessageInfo.media.find(
          media => media.id === localUploadID,
        );
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
        rawMessageInfo.type === messageTypes.MULTIMEDIA,
        `${localMessageID} should be messageTypes.MULTIMEDIA`,
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

  async sendMultimediaMessageAction(messageInfo: RawMultimediaMessageInfo) {
    const { localID, threadID, media } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      "localID should be set",
    );
    try {
      const result = await this.props.sendMultimediaMessage(
        threadID,
        localID,
        media.map(({ id }) => id),
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
    const imageInfos = validationResults.filter(Boolean).map(imageInfo => ({
      ...imageInfo,
      localID: `localUpload${nextLocalUploadID++}`,
    }));
    const localMessageID = `local${this.props.nextLocalID}`;

    if (imageInfos.length < validationResults.length) {
      // Since we filter our MIME types in our calls to CameraRoll,
      // this should never be triggered
      console.log('unexpected MIME type found');
    }
    if (imageInfos.length === 0) {
      return;
    }

    const pendingUploads = {};
    for (let { localID, uri } of imageInfos) {
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
        const messageInfo = ({
          type: messageTypes.MULTIMEDIA,
          localID: localMessageID,
          threadID,
          creatorID,
          time: Date.now(),
          media: imageInfos.map(
            ({ localID, uri, dimensions }) => ({
              id: localID,
              uri,
              type: "photo",
              dimensions,
            }),
          ),
        }: RawMultimediaMessageInfo);
        this.props.dispatchActionPayload(
          createLocalMultimediaMessageActionType,
          messageInfo,
        );
      },
    );

    await this.uploadFiles(localMessageID, imageInfos);
  }

  uploadFiles(
    localMessageID: string,
    imageInfos: $ReadOnlyArray<ImageInfo>,
  ) {
    return Promise.all(
      imageInfos.map(imageInfo => this.uploadFile(localMessageID, imageInfo)),
    );
  }

  async uploadFile(localMessageID: string, imageInfo: ImageInfo) {
    const { localID } = imageInfo;
    const conversionResult = await convertMedia(imageInfo);
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
      rawMessageInfo && rawMessageInfo.type === messageTypes.MULTIMEDIA,
      "messageStore should contain entry for message being retried",
    );
    const newRawMessageInfo = { ...rawMessageInfo, time: Date.now() };

    const incompleteMedia = rawMessageInfo.media.filter(
      ({ id }) => id.startsWith('localUpload'),
    );
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

    const imageGalleryImages = retryMedia.map(
      ({ dimensions, uri }) => ({ ...dimensions, uri }),
    );
    const validationResults = await Promise.all(
      imageGalleryImages.map(validateMedia),
    );

    const imageInfos = [];
    for (let i = 0; i < validationResults.length; i++) {
      const result = validationResults[i];
      if (!result) {
        continue;
      }
      const { id } = retryMedia[i];
      imageInfos.push({
        ...result,
        localID: id,
      });
    }
    if (imageInfos.length < validationResults.length) {
      // Since we filter our MIME types in our calls to CameraRoll,
      // this should never be triggered
      console.log('unexpected MIME type found');
    }
    if (imageInfos.length === 0) {
      return;
    }

    for (let { localID } of imageInfos) {
      pendingUploads[localID] = {
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

    await this.uploadFiles(localMessageID, imageInfos);
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
