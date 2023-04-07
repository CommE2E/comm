// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Platform } from 'react-native';
import * as Upload from 'react-native-background-upload';
import { useDispatch } from 'react-redux';
import { createSelector } from 'reselect';

import {
  createLocalMessageActionType,
  sendMultimediaMessageActionTypes,
  sendMultimediaMessage,
  sendTextMessageActionTypes,
  sendTextMessage,
} from 'lib/actions/message-actions.js';
import { queueReportsActionType } from 'lib/actions/report-actions.js';
import { newThread } from 'lib/actions/thread-actions.js';
import {
  uploadMultimedia,
  updateMultimediaMessageMediaActionType,
  type MultimediaUploadCallbacks,
  type MultimediaUploadExtras,
} from 'lib/actions/upload-actions.js';
import commStaffCommunity from 'lib/facts/comm-staff-community.js';
import { pathFromURI, replaceExtension } from 'lib/media/file-utils.js';
import {
  isLocalUploadID,
  getNextLocalUploadID,
} from 'lib/media/media-utils.js';
import { videoDurationLimit } from 'lib/media/video-utils.js';
import {
  createLoadingStatusSelector,
  combineLoadingStatuses,
} from 'lib/selectors/loading-selectors.js';
import {
  createMediaMessageInfo,
  localIDPrefix,
  useMessageCreationSideEffectsFunc,
} from 'lib/shared/message-utils.js';
import type { CreationSideEffectsFunc } from 'lib/shared/messages/message-spec.js';
import {
  createRealThreadFromPendingThread,
  threadIsPending,
  threadIsPendingSidebar,
  patchThreadInfoToIncludeMentionedMembersOfParent,
  threadInfoInsideCommunity,
} from 'lib/shared/thread-utils.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import type {
  UploadMultimediaResult,
  Media,
  NativeMediaSelection,
  MediaMissionResult,
  MediaMission,
} from 'lib/types/media-types.js';
import {
  messageTypes,
  type RawMessageInfo,
  type RawMultimediaMessageInfo,
  type SendMessageResult,
  type SendMessagePayload,
  type MessageInfo,
} from 'lib/types/message-types.js';
import type { RawImagesMessageInfo } from 'lib/types/messages/images.js';
import type {
  MediaMessageServerDBContent,
  RawMediaMessageInfo,
} from 'lib/types/messages/media.js';
import { getMediaMessageServerDBContentsFromMedia } from 'lib/types/messages/media.js';
import type { RawTextMessageInfo } from 'lib/types/messages/text.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import {
  type MediaMissionReportCreationRequest,
  reportTypes,
} from 'lib/types/report-types.js';
import {
  type ClientNewThreadRequest,
  type NewThreadResult,
  type ThreadInfo,
  threadTypes,
} from 'lib/types/thread-types.js';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';
import type {
  CallServerEndpointOptions,
  CallServerEndpointResponse,
} from 'lib/utils/call-server-endpoint.js';
import { getConfig } from 'lib/utils/config.js';
import { getMessageForException, cloneError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';
import { useIsReportEnabled } from 'lib/utils/report-utils.js';

import {
  type EditInputBarMessageParameters,
  type EditState,
  InputStateContext,
  type PendingMultimediaUploads,
  type MultimediaProcessingStep,
} from './input-state.js';
import { encryptMedia } from '../media/encryption-utils.js';
import { disposeTempFile } from '../media/file-utils.js';
import { processMedia } from '../media/media-utils.js';
import { displayActionResultModal } from '../navigation/action-result-modal.js';
import { useCalendarQuery } from '../navigation/nav-selectors.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

type MediaIDs =
  | { +type: 'photo', +localMediaID: string }
  | { +type: 'video', +localMediaID: string, +localThumbnailID: string };
type UploadFileInput = {
  +selection: NativeMediaSelection,
  +ids: MediaIDs,
};
type CompletedUploads = { +[localMessageID: string]: ?Set<string> };

type BaseProps = {
  +children: React.Node,
};
type Props = {
  ...BaseProps,
  +viewerID: ?string,
  +nextLocalID: number,
  +messageStoreMessages: { +[id: string]: RawMessageInfo },
  +ongoingMessageCreation: boolean,
  +hasWiFi: boolean,
  +mediaReportsEnabled: boolean,
  +calendarQuery: () => CalendarQuery,
  +dispatch: Dispatch,
  +staffCanSee: boolean,
  +dispatchActionPromise: DispatchActionPromise,
  +uploadMultimedia: (
    multimedia: Object,
    extras: MultimediaUploadExtras,
    callbacks: MultimediaUploadCallbacks,
  ) => Promise<UploadMultimediaResult>,
  +sendMultimediaMessage: (
    threadID: string,
    localID: string,
    mediaMessageContents: $ReadOnlyArray<MediaMessageServerDBContent>,
    sidebarCreation?: boolean,
  ) => Promise<SendMessageResult>,
  +sendTextMessage: (
    threadID: string,
    localID: string,
    text: string,
    sidebarCreation?: boolean,
  ) => Promise<SendMessageResult>,
  +newThread: (request: ClientNewThreadRequest) => Promise<NewThreadResult>,
  +textMessageCreationSideEffectsFunc: CreationSideEffectsFunc<RawTextMessageInfo>,
};
type State = {
  +pendingUploads: PendingMultimediaUploads,
  +editState: EditState,
};
class InputStateContainer extends React.PureComponent<Props, State> {
  state: State = {
    pendingUploads: {},
    editState: {
      editedMessage: null,
    },
  };
  sendCallbacks: Array<() => void> = [];
  activeURIs = new Map();
  editInputBarCallbacks: Array<
    (params: EditInputBarMessageParameters) => void,
  > = [];
  pendingThreadCreations = new Map<string, Promise<string>>();
  pendingThreadUpdateHandlers = new Map<string, (ThreadInfo) => mixed>();

  // When the user sends a multimedia message that triggers the creation of a
  // sidebar, the sidebar gets created right away, but the message needs to wait
  // for the uploads to complete before sending. We use this Set to track the
  // message localIDs that need sidebarCreation: true.
  pendingSidebarCreationMessageLocalIDs = new Set<string>();

  static getCompletedUploads(props: Props, state: State): CompletedUploads {
    const completedUploads = {};
    for (const localMessageID in state.pendingUploads) {
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

      let allUploadsComplete = true;
      const completedUploadIDs = new Set(Object.keys(messagePendingUploads));
      for (const singleMedia of rawMessageInfo.media) {
        if (isLocalUploadID(singleMedia.id)) {
          allUploadsComplete = false;
          completedUploadIDs.delete(singleMedia.id);
        }
      }

      if (allUploadsComplete) {
        completedUploads[localMessageID] = null;
      } else if (completedUploadIDs.size > 0) {
        completedUploads[localMessageID] = completedUploadIDs;
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
    for (const localMessageID in this.state.pendingUploads) {
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
      for (const localUploadID in messagePendingUploads) {
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

    for (const localMessageID of readyMessageIDs) {
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

  async dispatchMultimediaMessageAction(messageInfo: RawMultimediaMessageInfo) {
    if (!threadIsPending(messageInfo.threadID)) {
      this.props.dispatchActionPromise(
        sendMultimediaMessageActionTypes,
        this.sendMultimediaMessageAction(messageInfo),
        undefined,
        messageInfo,
      );
      return;
    }

    this.props.dispatch({
      type: sendMultimediaMessageActionTypes.started,
      payload: messageInfo,
    });

    let newThreadID = null;
    try {
      const threadCreationPromise = this.pendingThreadCreations.get(
        messageInfo.threadID,
      );
      if (!threadCreationPromise) {
        // When we create or retry multimedia message, we add a promise to
        // pendingThreadCreations map. This promise can be removed in
        // sendMultimediaMessage and sendTextMessage methods. When any of these
        // method remove the promise, it has to be settled. If the promise was
        // fulfilled, this method would be called with realized thread, so we
        // can conclude that the promise was rejected. We don't have enough info
        // here to retry the thread creation, but we can mark the message as
        // failed. Then the retry will be possible and promise will be created
        // again.
        throw new Error('Thread creation failed');
      }
      newThreadID = await threadCreationPromise;
    } catch (e) {
      const copy = cloneError(e);
      copy.localID = messageInfo.localID;
      copy.threadID = messageInfo.threadID;
      this.props.dispatch({
        type: sendMultimediaMessageActionTypes.failed,
        payload: copy,
        error: true,
      });
      return;
    } finally {
      this.pendingThreadCreations.delete(messageInfo.threadID);
    }

    const newMessageInfo = {
      ...messageInfo,
      threadID: newThreadID,
      time: Date.now(),
    };
    this.props.dispatchActionPromise(
      sendMultimediaMessageActionTypes,
      this.sendMultimediaMessageAction(newMessageInfo),
      undefined,
      newMessageInfo,
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
    const sidebarCreation =
      this.pendingSidebarCreationMessageLocalIDs.has(localID);
    const mediaMessageContents = getMediaMessageServerDBContentsFromMedia(
      messageInfo.media,
    );
    try {
      const result = await this.props.sendMultimediaMessage(
        threadID,
        localID,
        mediaMessageContents,
        sidebarCreation,
      );
      this.pendingSidebarCreationMessageLocalIDs.delete(localID);
      return {
        localID,
        serverID: result.id,
        threadID,
        time: result.time,
        interface: result.interface,
      };
    } catch (e) {
      const copy = cloneError(e);
      copy.localID = localID;
      copy.threadID = threadID;
      throw copy;
    }
  }

  inputStateSelector = createSelector(
    (state: State) => state.pendingUploads,
    (state: State) => state.editState,
    (pendingUploads: PendingMultimediaUploads, editState: EditState) => ({
      pendingUploads,
      sendTextMessage: this.sendTextMessage,
      sendMultimediaMessage: this.sendMultimediaMessage,
      editInputMessage: this.editInputMessage,
      addEditInputMessageListener: this.addEditInputMessageListener,
      removeEditInputMessageListener: this.removeEditInputMessageListener,
      messageHasUploadFailure: this.messageHasUploadFailure,
      retryMessage: this.retryMessage,
      registerSendCallback: this.registerSendCallback,
      unregisterSendCallback: this.unregisterSendCallback,
      uploadInProgress: this.uploadInProgress,
      reportURIDisplayed: this.reportURIDisplayed,
      setPendingThreadUpdateHandler: this.setPendingThreadUpdateHandler,
      editState,
      setEditedMessage: this.setEditedMessage,
    }),
  );

  uploadInProgress = () => {
    if (this.props.ongoingMessageCreation) {
      return true;
    }
    const { pendingUploads } = this.state;
    return values(pendingUploads).some(messagePendingUploads =>
      values(messagePendingUploads).some(upload => !upload.failed),
    );
  };

  sendTextMessage = async (
    messageInfo: RawTextMessageInfo,
    inputThreadInfo: ThreadInfo,
    parentThreadInfo: ?ThreadInfo,
  ) => {
    this.sendCallbacks.forEach(callback => callback());

    const { localID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );
    if (threadIsPendingSidebar(inputThreadInfo.id)) {
      this.pendingSidebarCreationMessageLocalIDs.add(localID);
    }

    if (!threadIsPending(inputThreadInfo.id)) {
      this.props.dispatchActionPromise(
        sendTextMessageActionTypes,
        this.sendTextMessageAction(
          messageInfo,
          inputThreadInfo,
          parentThreadInfo,
        ),
        undefined,
        messageInfo,
      );
      return;
    }

    this.props.dispatch({
      type: sendTextMessageActionTypes.started,
      payload: messageInfo,
    });

    let threadInfo = inputThreadInfo;
    const { viewerID } = this.props;
    if (viewerID && inputThreadInfo.type === threadTypes.SIDEBAR) {
      invariant(parentThreadInfo, 'sidebar should have parent');
      threadInfo = patchThreadInfoToIncludeMentionedMembersOfParent(
        inputThreadInfo,
        parentThreadInfo,
        messageInfo.text,
        viewerID,
      );
      if (threadInfo !== inputThreadInfo) {
        const pendingThreadUpdateHandler = this.pendingThreadUpdateHandlers.get(
          threadInfo.id,
        );
        pendingThreadUpdateHandler?.(threadInfo);
      }
    }

    let newThreadID = null;
    try {
      newThreadID = await this.startThreadCreation(threadInfo);
    } catch (e) {
      const copy = cloneError(e);
      copy.localID = messageInfo.localID;
      copy.threadID = messageInfo.threadID;
      this.props.dispatch({
        type: sendTextMessageActionTypes.failed,
        payload: copy,
        error: true,
      });
      return;
    } finally {
      this.pendingThreadCreations.delete(threadInfo.id);
    }

    const newMessageInfo = {
      ...messageInfo,
      threadID: newThreadID,
      time: Date.now(),
    };
    const newThreadInfo = {
      ...threadInfo,
      id: newThreadID,
    };
    this.props.dispatchActionPromise(
      sendTextMessageActionTypes,
      this.sendTextMessageAction(
        newMessageInfo,
        newThreadInfo,
        parentThreadInfo,
      ),
      undefined,
      newMessageInfo,
    );
  };

  startThreadCreation(threadInfo: ThreadInfo): Promise<string> {
    if (!threadIsPending(threadInfo.id)) {
      return Promise.resolve(threadInfo.id);
    }
    let threadCreationPromise = this.pendingThreadCreations.get(threadInfo.id);
    if (!threadCreationPromise) {
      const calendarQuery = this.props.calendarQuery();
      threadCreationPromise = createRealThreadFromPendingThread({
        threadInfo,
        dispatchActionPromise: this.props.dispatchActionPromise,
        createNewThread: this.props.newThread,
        sourceMessageID: threadInfo.sourceMessageID,
        viewerID: this.props.viewerID,
        calendarQuery,
      });
      this.pendingThreadCreations.set(threadInfo.id, threadCreationPromise);
    }
    return threadCreationPromise;
  }

  async sendTextMessageAction(
    messageInfo: RawTextMessageInfo,
    threadInfo: ThreadInfo,
    parentThreadInfo: ?ThreadInfo,
  ): Promise<SendMessagePayload> {
    try {
      await this.props.textMessageCreationSideEffectsFunc(
        messageInfo,
        threadInfo,
        parentThreadInfo,
      );
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
      );
      const sidebarCreation =
        this.pendingSidebarCreationMessageLocalIDs.has(localID);
      const result = await this.props.sendTextMessage(
        messageInfo.threadID,
        localID,
        messageInfo.text,
        sidebarCreation,
      );
      this.pendingSidebarCreationMessageLocalIDs.delete(localID);
      return {
        localID,
        serverID: result.id,
        threadID: messageInfo.threadID,
        time: result.time,
        interface: result.interface,
      };
    } catch (e) {
      const copy = cloneError(e);
      copy.localID = messageInfo.localID;
      copy.threadID = messageInfo.threadID;
      throw copy;
    }
  }

  shouldEncryptMedia(threadInfo: ThreadInfo): boolean {
    return threadInfoInsideCommunity(threadInfo, commStaffCommunity.id);
  }

  sendMultimediaMessage = async (
    selections: $ReadOnlyArray<NativeMediaSelection>,
    threadInfo: ThreadInfo,
  ) => {
    this.sendCallbacks.forEach(callback => callback());
    const localMessageID = `${localIDPrefix}${this.props.nextLocalID}`;
    this.startThreadCreation(threadInfo);

    if (threadIsPendingSidebar(threadInfo.id)) {
      this.pendingSidebarCreationMessageLocalIDs.add(localMessageID);
    }

    const uploadFileInputs = [],
      media = [];
    for (const selection of selections) {
      const localMediaID = getNextLocalUploadID();
      let ids;
      if (
        selection.step === 'photo_library' ||
        selection.step === 'photo_capture' ||
        selection.step === 'photo_paste'
      ) {
        media.push({
          id: localMediaID,
          uri: selection.uri,
          type: 'photo',
          dimensions: selection.dimensions,
          localMediaSelection: selection,
        });
        ids = { type: 'photo', localMediaID };
      }
      const localThumbnailID = getNextLocalUploadID();
      if (selection.step === 'video_library') {
        media.push({
          id: localMediaID,
          uri: selection.uri,
          type: 'video',
          dimensions: selection.dimensions,
          localMediaSelection: selection,
          loop: false,
          thumbnailID: localThumbnailID,
          thumbnailURI: selection.uri,
        });
        ids = { type: 'video', localMediaID, localThumbnailID };
      }
      invariant(ids, `unexpected MediaSelection ${selection.step}`);
      uploadFileInputs.push({ selection, ids });
    }

    const pendingUploads = {};
    for (const uploadFileInput of uploadFileInputs) {
      const { localMediaID } = uploadFileInput.ids;
      pendingUploads[localMediaID] = {
        failed: false,
        progressPercent: 0,
        processingStep: null,
      };
      if (uploadFileInput.ids.type === 'video') {
        const { localThumbnailID } = uploadFileInput.ids;
        pendingUploads[localThumbnailID] = {
          failed: false,
          progressPercent: 0,
          processingStep: null,
        };
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
        invariant(creatorID, 'need viewer ID in order to send a message');
        const messageInfo = createMediaMessageInfo(
          {
            localID: localMessageID,
            threadID: threadInfo.id,
            creatorID,
            media,
          },
          { forceMultimediaMessageType: this.shouldEncryptMedia(threadInfo) },
        );
        this.props.dispatch({
          type: createLocalMessageActionType,
          payload: messageInfo,
        });
      },
    );

    await this.uploadFiles(localMessageID, uploadFileInputs, threadInfo);
  };

  async uploadFiles(
    localMessageID: string,
    uploadFileInputs: $ReadOnlyArray<UploadFileInput>,
    threadInfo: ThreadInfo,
  ) {
    const results = await Promise.all(
      uploadFileInputs.map(uploadFileInput =>
        this.uploadFile(localMessageID, uploadFileInput, threadInfo),
      ),
    );
    const errors = [...new Set(results.filter(Boolean))];
    if (errors.length > 0) {
      displayActionResultModal(errors.join(', ') + ' :(');
    }
  }

  async uploadFile(
    localMessageID: string,
    uploadFileInput: UploadFileInput,
    threadInfo: ThreadInfo,
  ): Promise<?string> {
    const { ids, selection } = uploadFileInput;
    const { localMediaID } = ids;
    const start = selection.sendTime;
    const steps = [selection];
    let serverID;
    let userTime;
    let errorMessage;
    let reportPromise;
    const filesToDispose = [];

    const onUploadFinished = async (result: MediaMissionResult) => {
      if (!this.props.mediaReportsEnabled) {
        return errorMessage;
      }
      if (reportPromise) {
        const finalSteps = await reportPromise;
        steps.push(...finalSteps);
      }
      const totalTime = Date.now() - start;
      userTime = userTime ? userTime : totalTime;
      this.queueMediaMissionReport(
        { localID: localMediaID, localMessageID, serverID },
        { steps, result, totalTime, userTime },
      );
      return errorMessage;
    };
    const onUploadFailed = (mediaID: string, message: string) => {
      errorMessage = message;
      this.handleUploadFailure(localMessageID, mediaID);
      userTime = Date.now() - start;
    };

    const onTranscodingProgress = (percent: number) => {
      this.setProgress(localMessageID, localMediaID, 'transcoding', percent);
    };

    let processedMedia;
    const processingStart = Date.now();
    try {
      const processMediaReturn = processMedia(selection, {
        hasWiFi: this.props.hasWiFi,
        finalFileHeaderCheck: this.props.staffCanSee,
        onTranscodingProgress,
      });
      reportPromise = processMediaReturn.reportPromise;
      const processResult = await processMediaReturn.resultPromise;
      if (!processResult.success) {
        const message =
          processResult.reason === 'video_too_long'
            ? `can't do vids longer than ${videoDurationLimit}min`
            : 'processing failed';
        onUploadFailed(localMediaID, message);
        return await onUploadFinished(processResult);
      }
      if (processResult.shouldDisposePath) {
        filesToDispose.push(processResult.shouldDisposePath);
      }
      processedMedia = processResult;
    } catch (e) {
      onUploadFailed(localMediaID, 'processing failed');
      return await onUploadFinished({
        success: false,
        reason: 'processing_exception',
        time: Date.now() - processingStart,
        exceptionMessage: getMessageForException(e),
      });
    }

    let encryptionSteps = [];
    if (this.shouldEncryptMedia(threadInfo)) {
      const encryptionStart = Date.now();
      try {
        const { result: encryptionResult, ...encryptionReturn } =
          await encryptMedia(processedMedia);
        encryptionSteps = encryptionReturn.steps;
        if (!encryptionResult.success) {
          onUploadFailed(localMediaID, encryptionResult.reason);
          return await onUploadFinished(encryptionResult);
        }
        if (encryptionResult.shouldDisposePath) {
          filesToDispose.push(encryptionResult.shouldDisposePath);
        }
        processedMedia = encryptionResult;
      } catch (e) {
        onUploadFailed(localMediaID, 'encryption failed');
        return await onUploadFinished({
          success: false,
          reason: 'encryption_exception',
          time: Date.now() - encryptionStart,
          exceptionMessage: getMessageForException(e),
        });
      }
    }

    const { uploadURI, filename, mime } = processedMedia;

    const { hasWiFi } = this.props;

    const uploadStart = Date.now();
    let uploadExceptionMessage,
      uploadResult,
      uploadThumbnailResult,
      mediaMissionResult;
    try {
      const uploadPromises = [];
      uploadPromises.push(
        this.props.uploadMultimedia(
          { uri: uploadURI, name: filename, type: mime },
          {
            ...processedMedia.dimensions,
            loop:
              processedMedia.mediaType === 'video' ||
              processedMedia.mediaType === 'encrypted_video'
                ? processedMedia.loop
                : undefined,
            encryptionKey: processedMedia.encryptionKey,
          },
          {
            onProgress: (percent: number) =>
              this.setProgress(
                localMessageID,
                localMediaID,
                'uploading',
                percent,
              ),
            uploadBlob: this.uploadBlob,
          },
        ),
      );

      if (
        processedMedia.mediaType === 'video' ||
        processedMedia.mediaType === 'encrypted_video'
      ) {
        uploadPromises.push(
          this.props.uploadMultimedia(
            {
              uri: processedMedia.uploadThumbnailURI,
              name: replaceExtension(`thumb${filename}`, 'jpg'),
              type: 'image/jpeg',
            },
            {
              ...processedMedia.dimensions,
              loop: false,
              encryptionKey: processedMedia.thumbnailEncryptionKey,
            },
            {
              uploadBlob: this.uploadBlob,
            },
          ),
        );
      }
      [uploadResult, uploadThumbnailResult] = await Promise.all(uploadPromises);
      mediaMissionResult = { success: true };
    } catch (e) {
      uploadExceptionMessage = getMessageForException(e);
      onUploadFailed(localMediaID, 'upload failed');
      mediaMissionResult = {
        success: false,
        reason: 'http_upload_failed',
        exceptionMessage: uploadExceptionMessage,
      };
    }

    if (
      ((processedMedia.mediaType === 'photo' ||
        processedMedia.mediaType === 'encrypted_photo') &&
        uploadResult) ||
      ((processedMedia.mediaType === 'video' ||
        processedMedia.mediaType === 'encrypted_video') &&
        uploadResult &&
        uploadThumbnailResult)
    ) {
      const { encryptionKey } = processedMedia;
      const { id, uri, dimensions, loop } = uploadResult;
      serverID = id;

      const mediaSourcePayload =
        processedMedia.mediaType === 'encrypted_photo' ||
        processedMedia.mediaType === 'encrypted_video'
          ? {
              type: processedMedia.mediaType,
              holder: uri,
              encryptionKey,
            }
          : {
              type: uploadResult.mediaType,
              uri,
            };
      let updateMediaPayload = {
        messageID: localMessageID,
        currentMediaID: localMediaID,
        mediaUpdate: {
          id,
          ...mediaSourcePayload,
          dimensions,
          localMediaSelection: undefined,
          loop: uploadResult.mediaType === 'video' ? loop : undefined,
        },
      };

      if (
        processedMedia.mediaType === 'video' ||
        processedMedia.mediaType === 'encrypted_video'
      ) {
        invariant(uploadThumbnailResult, 'uploadThumbnailResult exists');
        const { uri: thumbnailURI, id: thumbnailID } = uploadThumbnailResult;
        const { thumbnailEncryptionKey } = processedMedia;

        if (processedMedia.mediaType === 'encrypted_video') {
          updateMediaPayload = {
            ...updateMediaPayload,
            mediaUpdate: {
              ...updateMediaPayload.mediaUpdate,
              thumbnailID,
              thumbnailHolder: thumbnailURI,
              thumbnailEncryptionKey,
            },
          };
        } else {
          updateMediaPayload = {
            ...updateMediaPayload,
            mediaUpdate: {
              ...updateMediaPayload.mediaUpdate,
              thumbnailID,
              thumbnailURI,
            },
          };
        }
      }

      // When we dispatch this action, it updates Redux and triggers the
      // componentDidUpdate in this class. componentDidUpdate will handle
      // calling dispatchMultimediaMessageAction once all the uploads are
      // complete, and does not wait until this function concludes.
      this.props.dispatch({
        type: updateMultimediaMessageMediaActionType,
        payload: updateMediaPayload,
      });
      userTime = Date.now() - start;
    }

    const processSteps = await reportPromise;
    reportPromise = null;
    steps.push(...processSteps);
    steps.push(...encryptionSteps);
    steps.push({
      step: 'upload',
      success: !!uploadResult,
      exceptionMessage: uploadExceptionMessage,
      time: Date.now() - uploadStart,
      inputFilename: filename,
      outputMediaType: uploadResult && uploadResult.mediaType,
      outputURI: uploadResult && uploadResult.uri,
      outputDimensions: uploadResult && uploadResult.dimensions,
      outputLoop: uploadResult && uploadResult.loop,
      hasWiFi,
    });

    const cleanupPromises = [];

    if (filesToDispose.length > 0) {
      // If processMedia needed to do any transcoding before upload, we dispose
      // of the resultant temporary file here. Since the transcoded temporary
      // file is only used for upload, we can dispose of it after processMedia
      // (reportPromise) and the upload are complete
      filesToDispose.forEach(shouldDisposePath => {
        cleanupPromises.push(
          (async () => {
            const disposeStep = await disposeTempFile(shouldDisposePath);
            steps.push(disposeStep);
          })(),
        );
      });
    }

    // if there's a thumbnail we'll temporarily unlink it here
    // instead of in media-utils, will be changed in later diffs
    if (processedMedia.mediaType === 'video') {
      const { uploadThumbnailURI } = processedMedia;
      cleanupPromises.push(
        (async () => {
          const { steps: clearSteps, result: thumbnailPath } =
            await this.waitForCaptureURIUnload(uploadThumbnailURI);
          steps.push(...clearSteps);
          if (!thumbnailPath) {
            return;
          }
          const disposeStep = await disposeTempFile(thumbnailPath);
          steps.push(disposeStep);
        })(),
      );
    }

    if (selection.captureTime || selection.step === 'photo_paste') {
      // If we are uploading a newly captured photo, we dispose of the original
      // file here. Note that we try to save photo captures to the camera roll
      // if we have permission. Even if we fail, this temporary file isn't
      // visible to the user, so there's no point in keeping it around. Since
      // the initial URI is used in rendering paths, we have to wait for it to
      // be replaced with the remote URI before we can dispose. Check out the
      // Multimedia component to see how the URIs get switched out.
      const captureURI = selection.uri;
      cleanupPromises.push(
        (async () => {
          const { steps: clearSteps, result: capturePath } =
            await this.waitForCaptureURIUnload(captureURI);
          steps.push(...clearSteps);
          if (!capturePath) {
            return;
          }
          const disposeStep = await disposeTempFile(capturePath);
          steps.push(disposeStep);
        })(),
      );
    }

    await Promise.all(cleanupPromises);

    return await onUploadFinished(mediaMissionResult);
  }

  setProgress(
    localMessageID: string,
    localUploadID: string,
    processingStep: MultimediaProcessingStep,
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
          processingStep,
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
    options?: ?CallServerEndpointOptions,
  ): Promise<CallServerEndpointResponse> => {
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

    for (const key in input) {
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
        try {
          resolve(JSON.parse(data.responseBody));
        } catch (e) {
          reject(e);
        }
      });
      if (options && options.onProgress) {
        const { onProgress } = options;
        Upload.addListener('progress', uploadID, data =>
          onProgress(data.progress / 100),
        );
      }
    });
  };

  handleUploadFailure(localMessageID: string, localUploadID: string) {
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
              failed: true,
              progressPercent: 0,
            },
          },
        },
      };
    });
  }

  queueMediaMissionReport(
    ids: { localID: string, localMessageID: string, serverID: ?string },
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
    this.props.dispatch({
      type: queueReportsActionType,
      payload: {
        reports: [report],
      },
    });
  }

  messageHasUploadFailure = (localMessageID: string) => {
    const pendingUploads = this.state.pendingUploads[localMessageID];
    if (!pendingUploads) {
      return false;
    }
    return values(pendingUploads).some(upload => upload.failed);
  };

  editInputMessage = (params: EditInputBarMessageParameters) => {
    this.editInputBarCallbacks.forEach(addEditInputBarCallback =>
      addEditInputBarCallback(params),
    );
  };

  addEditInputMessageListener = (
    callbackEditInputBar: (params: EditInputBarMessageParameters) => void,
  ) => {
    this.editInputBarCallbacks.push(callbackEditInputBar);
  };

  setEditedMessage = (editedMessage: ?MessageInfo) => {
    this.setState({
      editState: { editedMessage },
    });
  };

  removeEditInputMessageListener = (
    callbackEditInputBar: (params: EditInputBarMessageParameters) => void,
  ) => {
    this.editInputBarCallbacks = this.editInputBarCallbacks.filter(
      candidate => candidate !== callbackEditInputBar,
    );
  };

  retryTextMessage = async (
    rawMessageInfo: RawTextMessageInfo,
    threadInfo: ThreadInfo,
    parentThreadInfo: ?ThreadInfo,
  ) => {
    await this.sendTextMessage(
      {
        ...rawMessageInfo,
        time: Date.now(),
      },
      threadInfo,
      parentThreadInfo,
    );
  };

  retryMultimediaMessage = async (
    rawMessageInfo: RawMultimediaMessageInfo,
    localMessageID: string,
    threadInfo: ThreadInfo,
  ) => {
    const pendingUploads = this.state.pendingUploads[localMessageID] ?? {};

    const now = Date.now();

    this.startThreadCreation(threadInfo);

    if (threadIsPendingSidebar(threadInfo.id)) {
      this.pendingSidebarCreationMessageLocalIDs.add(localMessageID);
    }

    const updateMedia = <T: Media>(media: $ReadOnlyArray<T>): T[] =>
      media.map(singleMedia => {
        invariant(
          singleMedia.type === 'photo' || singleMedia.type === 'video',
          'Retry selection must be unencrypted',
        );

        let updatedMedia = singleMedia;

        const oldMediaID = updatedMedia.id;
        if (
          // not complete
          isLocalUploadID(oldMediaID) &&
          // not still ongoing
          (!pendingUploads[oldMediaID] || pendingUploads[oldMediaID].failed)
        ) {
          // If we have an incomplete upload that isn't in pendingUploads, that
          // indicates the app has restarted. We'll reassign a new localID to
          // avoid collisions. Note that this isn't necessary for the message ID
          // since the localID reducer prevents collisions there
          const mediaID = pendingUploads[oldMediaID]
            ? oldMediaID
            : getNextLocalUploadID();
          if (updatedMedia.type === 'photo') {
            updatedMedia = {
              type: 'photo',
              ...updatedMedia,
              id: mediaID,
            };
          } else {
            updatedMedia = {
              type: 'video',
              ...updatedMedia,
              id: mediaID,
            };
          }
        }

        if (updatedMedia.type === 'video') {
          const oldThumbnailID = updatedMedia.thumbnailID;
          invariant(oldThumbnailID, 'oldThumbnailID not null or undefined');
          if (
            // not complete
            isLocalUploadID(oldThumbnailID) &&
            // not still ongoing
            (!pendingUploads[oldThumbnailID] ||
              pendingUploads[oldThumbnailID].failed)
          ) {
            const thumbnailID = pendingUploads[oldThumbnailID]
              ? oldThumbnailID
              : getNextLocalUploadID();
            updatedMedia = {
              ...updatedMedia,
              thumbnailID,
            };
          }
        }

        if (updatedMedia === singleMedia) {
          return singleMedia;
        }

        const oldSelection = updatedMedia.localMediaSelection;
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
        } else if (oldSelection.step === 'photo_paste') {
          selection = { ...oldSelection, sendTime: now, retries };
        } else {
          selection = { ...oldSelection, sendTime: now, retries };
        }

        if (updatedMedia.type === 'photo') {
          return {
            type: 'photo',
            ...updatedMedia,
            localMediaSelection: selection,
          };
        }
        return {
          type: 'video',
          ...updatedMedia,
          localMediaSelection: selection,
        };
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
    for (const singleMedia of newRawMessageInfo.media) {
      if (isLocalUploadID(singleMedia.id)) {
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
    this.props.dispatch({
      type: sendMultimediaMessageActionTypes.started,
      payload: newRawMessageInfo,
    });

    // We clear out the failed status on individual media here,
    // which makes the UI show pending status instead of error messages
    for (const singleMedia of retryMedia) {
      pendingUploads[singleMedia.id] = {
        failed: false,
        progressPercent: 0,
        processingStep: null,
      };
      if (singleMedia.type === 'video') {
        const { thumbnailID } = singleMedia;
        invariant(thumbnailID, 'thumbnailID not null or undefined');
        pendingUploads[thumbnailID] = {
          failed: false,
          progressPercent: 0,
          processingStep: null,
        };
      }
    }
    this.setState(prevState => ({
      pendingUploads: {
        ...prevState.pendingUploads,
        [localMessageID]: pendingUploads,
      },
    }));

    const uploadFileInputs = retryMedia.map(singleMedia => {
      invariant(
        singleMedia.localMediaSelection,
        'localMediaSelection should be set on locally created Media',
      );

      let ids;
      if (singleMedia.type === 'photo') {
        ids = { type: 'photo', localMediaID: singleMedia.id };
      } else {
        invariant(
          singleMedia.thumbnailID,
          'singleMedia.thumbnailID should be set for videos',
        );
        ids = {
          type: 'video',
          localMediaID: singleMedia.id,
          localThumbnailID: singleMedia.thumbnailID,
        };
      }

      return {
        selection: singleMedia.localMediaSelection,
        ids,
      };
    });

    await this.uploadFiles(localMessageID, uploadFileInputs, threadInfo);
  };

  retryMessage = async (
    localMessageID: string,
    threadInfo: ThreadInfo,
    parentThreadInfo: ?ThreadInfo,
  ) => {
    this.sendCallbacks.forEach(callback => callback());

    const rawMessageInfo = this.props.messageStoreMessages[localMessageID];
    invariant(rawMessageInfo, `rawMessageInfo ${localMessageID} should exist`);

    if (rawMessageInfo.type === messageTypes.TEXT) {
      await this.retryTextMessage(rawMessageInfo, threadInfo, parentThreadInfo);
    } else if (
      rawMessageInfo.type === messageTypes.IMAGES ||
      rawMessageInfo.type === messageTypes.MULTIMEDIA
    ) {
      await this.retryMultimediaMessage(
        rawMessageInfo,
        localMessageID,
        threadInfo,
      );
    }
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
    for (const callback of onClear) {
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

  setPendingThreadUpdateHandler = (
    threadID: string,
    pendingThreadUpdateHandler: ?(ThreadInfo) => mixed,
  ) => {
    if (!pendingThreadUpdateHandler) {
      this.pendingThreadUpdateHandlers.delete(threadID);
    } else {
      this.pendingThreadUpdateHandlers.set(
        threadID,
        pendingThreadUpdateHandler,
      );
    }
  };

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

const ConnectedInputStateContainer: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedInputStateContainer(
    props: BaseProps,
  ) {
    const viewerID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );
    const nextLocalID = useSelector(state => state.nextLocalID);
    const messageStoreMessages = useSelector(
      state => state.messageStore.messages,
    );
    const ongoingMessageCreation = useSelector(
      state =>
        combineLoadingStatuses(
          mediaCreationLoadingStatusSelector(state),
          textCreationLoadingStatusSelector(state),
        ) === 'loading',
    );
    const hasWiFi = useSelector(state => state.connectivity.hasWiFi);
    const calendarQuery = useCalendarQuery();
    const callUploadMultimedia = useServerCall(uploadMultimedia);
    const callSendMultimediaMessage = useServerCall(sendMultimediaMessage);
    const callSendTextMessage = useServerCall(sendTextMessage);
    const callNewThread = useServerCall(newThread);
    const dispatchActionPromise = useDispatchActionPromise();
    const dispatch = useDispatch();
    const mediaReportsEnabled = useIsReportEnabled('mediaReports');
    const staffCanSee = useStaffCanSee();
    const textMessageCreationSideEffectsFunc =
      useMessageCreationSideEffectsFunc(messageTypes.TEXT);

    return (
      <InputStateContainer
        {...props}
        viewerID={viewerID}
        nextLocalID={nextLocalID}
        messageStoreMessages={messageStoreMessages}
        ongoingMessageCreation={ongoingMessageCreation}
        hasWiFi={hasWiFi}
        mediaReportsEnabled={mediaReportsEnabled}
        calendarQuery={calendarQuery}
        uploadMultimedia={callUploadMultimedia}
        sendMultimediaMessage={callSendMultimediaMessage}
        sendTextMessage={callSendTextMessage}
        newThread={callNewThread}
        dispatchActionPromise={dispatchActionPromise}
        dispatch={dispatch}
        staffCanSee={staffCanSee}
        textMessageCreationSideEffectsFunc={textMessageCreationSideEffectsFunc}
      />
    );
  });

export default ConnectedInputStateContainer;
