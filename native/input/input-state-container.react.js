// @flow

import * as FileSystem from 'expo-file-system';
import invariant from 'invariant';
import * as React from 'react';
import { Platform } from 'react-native';
import { createSelector } from 'reselect';

import {
  createLocalMessageActionType,
  sendMultimediaMessageActionTypes,
  sendTextMessageActionTypes,
} from 'lib/actions/message-actions.js';
import { queueReportsActionType } from 'lib/actions/report-actions.js';
import { useNewThinThread } from 'lib/actions/thread-actions.js';
import {
  type BlobServiceUploadAction,
  type BlobServiceUploadResult,
  updateMultimediaMessageMediaActionType,
  useBlobServiceUpload,
} from 'lib/actions/upload-actions.js';
import { useInvalidCSATLogOut } from 'lib/actions/user-actions.js';
import {
  type SendMultimediaMessagePayload,
  useInputStateContainerSendMultimediaMessage,
  useInputStateContainerSendTextMessage,
} from 'lib/hooks/input-state-container-hooks.js';
import { useNewThickThread } from 'lib/hooks/thread-hooks.js';
import type {
  CallSingleKeyserverEndpointOptions,
  CallSingleKeyserverEndpointResponse,
} from 'lib/keyserver-conn/call-single-keyserver-endpoint.js';
import { pathFromURI, replaceExtension } from 'lib/media/file-utils.js';
import {
  getNextLocalUploadID,
  isLocalUploadID,
} from 'lib/media/media-utils.js';
import { videoDurationLimit } from 'lib/media/video-utils.js';
import {
  combineLoadingStatuses,
  createLoadingStatusSelector,
} from 'lib/selectors/loading-selectors.js';
import {
  createMediaMessageInfo,
  useMessageCreationSideEffectsFunc,
  getNextLocalID,
} from 'lib/shared/message-utils.js';
import type { CreationSideEffectsFunc } from 'lib/shared/messages/message-spec.js';
import { createRealThreadFromPendingThread } from 'lib/shared/thread-actions-utils.js';
import {
  patchThreadInfoToIncludeMentionedMembersOfParent,
  threadIsPending,
  threadIsPendingSidebar,
} from 'lib/shared/thread-utils.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import type {
  Media,
  MediaMission,
  MediaMissionResult,
  MediaMissionStep,
  NativeMediaSelection,
} from 'lib/types/media-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import {
  type RawMessageInfo,
  type RawMultimediaMessageInfo,
  type SendMessagePayload,
} from 'lib/types/message-types.js';
import type { RawImagesMessageInfo } from 'lib/types/messages/images.js';
import type { RawMediaMessageInfo } from 'lib/types/messages/media.js';
import type { RawTextMessageInfo } from 'lib/types/messages/text.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import {
  type ClientMediaMissionReportCreationRequest,
  reportTypes,
} from 'lib/types/report-types.js';
import {
  threadTypeIsThick,
  threadTypeIsSidebar,
} from 'lib/types/thread-types-enum.js';
import type { ThreadType } from 'lib/types/thread-types-enum.js';
import {
  type ClientNewThinThreadRequest,
  type NewThreadResult,
  type NewThickThreadRequest,
} from 'lib/types/thread-types.js';
import { getConfig } from 'lib/utils/config.js';
import { getMessageForException, SendMessageError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import {
  generateReportID,
  useIsReportEnabled,
} from 'lib/utils/report-utils.js';

import {
  type EditInputBarMessageParameters,
  type InputState,
  InputStateContext,
  type MessagePendingUploads,
  type MultimediaProcessingStep,
  type PendingMultimediaUploads,
} from './input-state.js';
import { encryptMedia } from '../media/encryption-utils.js';
import { disposeTempFile } from '../media/file-utils.js';
import { processMedia } from '../media/media-utils.js';
import { displayActionResultModal } from '../navigation/action-result-modal.js';
import { useCalendarQuery } from '../navigation/nav-selectors.js';
import { useSelector } from '../redux/redux-utils.js';
import blobServiceUploadHandler from '../utils/blob-service-upload.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

type MediaIDs =
  | { +type: 'photo', +localMediaID: string }
  | { +type: 'video', +localMediaID: string, +localThumbnailID: string };
type UploadFileInput = {
  +selection: NativeMediaSelection,
  +ids: MediaIDs,
};
type WritableCompletedUploads = {
  [localMessageID: string]: ?$ReadOnlySet<string>,
};
type CompletedUploads = $ReadOnly<WritableCompletedUploads>;
type ActiveURI = { +count: number, +onClear: $ReadOnlyArray<() => mixed> };

type BaseProps = {
  +children: React.Node,
};
type Props = {
  ...BaseProps,
  +viewerID: ?string,
  +messageStoreMessages: { +[id: string]: RawMessageInfo },
  +ongoingMessageCreation: boolean,
  +hasWiFi: boolean,
  +mediaReportsEnabled: boolean,
  +calendarQuery: () => CalendarQuery,
  +dispatch: Dispatch,
  +staffCanSee: boolean,
  +dispatchActionPromise: DispatchActionPromise,
  +blobServiceUpload: BlobServiceUploadAction,
  +sendMultimediaMessage: (
    messageInfo: RawMultimediaMessageInfo,
    sidebarCreation: boolean,
    isLegacy: boolean,
  ) => Promise<SendMultimediaMessagePayload>,
  +sendTextMessage: (
    messageInfo: RawTextMessageInfo,
    threadInfo: ThreadInfo,
    parentThreadInfo: ?ThreadInfo,
    sidebarCreation: boolean,
  ) => Promise<SendMessagePayload>,
  +newThinThread: (
    request: ClientNewThinThreadRequest,
  ) => Promise<NewThreadResult>,
  +newThickThread: (request: NewThickThreadRequest) => Promise<string>,
  +textMessageCreationSideEffectsFunc: CreationSideEffectsFunc<RawTextMessageInfo>,
  +invalidTokenLogOut: () => Promise<void>,
};
type State = {
  +pendingUploads: PendingMultimediaUploads,
};

class InputStateContainer extends React.PureComponent<Props, State> {
  state: State = {
    pendingUploads: {},
  };
  sendCallbacks: Array<() => void> = [];
  activeURIs: Map<string, ActiveURI> = new Map();
  editInputBarCallbacks: Array<
    (params: EditInputBarMessageParameters) => void,
  > = [];
  scrollToMessageCallbacks: Array<(messageID: string) => void> = [];
  pendingThreadCreations: Map<
    string,
    Promise<{
      +threadID: string,
      +threadType: ThreadType,
    }>,
  > = new Map();
  pendingThreadUpdateHandlers: Map<string, (ThreadInfo) => mixed> = new Map();

  // When the user sends a multimedia message that triggers the creation of a
  // sidebar, the sidebar gets created right away, but the message needs to wait
  // for the uploads to complete before sending. We use this Set to track the
  // message localIDs that need sidebarCreation: true.
  pendingSidebarCreationMessageLocalIDs: Set<string> = new Set();

  static getCompletedUploads(props: Props, state: State): CompletedUploads {
    const completedUploads: WritableCompletedUploads = {};
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
        const { thumbnailID } = singleMedia;
        if (thumbnailID && isLocalUploadID(thumbnailID)) {
          allUploadsComplete = false;
          completedUploadIDs.delete(thumbnailID);
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

    const newPendingUploads: PendingMultimediaUploads = {};
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

      const newUploads: MessagePendingUploads = {};
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
      void this.dispatchMultimediaMessageAction(rawMessageInfo);
    }
  }

  async dispatchMultimediaMessageAction(
    messageInfo: RawMultimediaMessageInfo,
  ): Promise<void> {
    if (!threadIsPending(messageInfo.threadID)) {
      void this.props.dispatchActionPromise(
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
      const result = await threadCreationPromise;
      newThreadID = result.threadID;
    } catch (e) {
      const exceptionMessage = getMessageForException(e) ?? '';
      const payload = new SendMessageError(
        `Exception while creating thread: ${exceptionMessage}`,
        messageInfo.localID ?? '',
        messageInfo.threadID,
      );
      this.props.dispatch({
        type: sendMultimediaMessageActionTypes.failed,
        payload,
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
    void this.props.dispatchActionPromise(
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
    try {
      const { result } = await this.props.sendMultimediaMessage(
        messageInfo,
        sidebarCreation,
        false,
      );
      this.pendingSidebarCreationMessageLocalIDs.delete(localID);
      return result;
    } catch (e) {
      const exceptionMessage = getMessageForException(e) ?? '';
      if (exceptionMessage === 'invalid_csat') {
        void this.props.invalidTokenLogOut();
      }
      throw new SendMessageError(
        `Exception when sending multimedia message: ${exceptionMessage}`,
        localID,
        threadID,
      );
    }
  }

  inputStateSelector: State => InputState = createSelector(
    (state: State) => state.pendingUploads,
    (pendingUploads: PendingMultimediaUploads) =>
      ({
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
        scrollToMessage: this.scrollToMessage,
        addScrollToMessageListener: this.addScrollToMessageListener,
        removeScrollToMessageListener: this.removeScrollToMessageListener,
      }: InputState),
  );

  scrollToMessage = (messageID: string) => {
    this.scrollToMessageCallbacks.forEach(callback => callback(messageID));
  };

  addScrollToMessageListener = (callback: (messageID: string) => void) => {
    this.scrollToMessageCallbacks.push(callback);
  };

  removeScrollToMessageListener = (
    callbackScrollToMessage: (messageID: string) => void,
  ) => {
    this.scrollToMessageCallbacks = this.scrollToMessageCallbacks.filter(
      candidate => candidate !== callbackScrollToMessage,
    );
  };

  uploadInProgress = (): boolean => {
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
      void this.props.dispatchActionPromise(
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
    if (viewerID && threadTypeIsSidebar(inputThreadInfo.type)) {
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

    let threadCreationResult = null;
    try {
      threadCreationResult = await this.startThreadCreation(threadInfo);
    } catch (e) {
      const exceptionMessage = getMessageForException(e) ?? '';
      const payload = new SendMessageError(
        `Exception while creating thread: ${exceptionMessage}`,
        messageInfo.localID ?? '',
        messageInfo.threadID,
      );
      this.props.dispatch({
        type: sendTextMessageActionTypes.failed,
        payload,
        error: true,
      });
      return;
    } finally {
      this.pendingThreadCreations.delete(threadInfo.id);
    }

    const newMessageInfo = {
      ...messageInfo,
      threadID: threadCreationResult?.threadID,
      time: Date.now(),
    };

    const newThreadInfo = {
      ...threadInfo,
      id: threadCreationResult?.threadID,
      type: threadCreationResult?.threadType ?? threadInfo.type,
    };

    void this.props.dispatchActionPromise(
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

  startThreadCreation(
    threadInfo: ThreadInfo,
  ): Promise<{ +threadID: string, +threadType: ThreadType }> {
    if (!threadIsPending(threadInfo.id)) {
      return Promise.resolve({
        threadID: threadInfo.id,
        threadType: threadInfo.type,
      });
    }
    let threadCreationPromise = this.pendingThreadCreations.get(threadInfo.id);
    if (!threadCreationPromise) {
      const calendarQuery = this.props.calendarQuery();
      threadCreationPromise = createRealThreadFromPendingThread({
        threadInfo,
        dispatchActionPromise: this.props.dispatchActionPromise,
        createNewThinThread: this.props.newThinThread,
        createNewThickThread: this.props.newThickThread,
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
      if (!threadTypeIsThick(threadInfo.type)) {
        await this.props.textMessageCreationSideEffectsFunc(
          messageInfo,
          threadInfo,
          parentThreadInfo,
        );
      }
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
      );
      const sidebarCreation =
        this.pendingSidebarCreationMessageLocalIDs.has(localID);
      const result = await this.props.sendTextMessage(
        messageInfo,
        threadInfo,
        parentThreadInfo,
        sidebarCreation,
      );
      if (threadTypeIsThick(threadInfo.type)) {
        await this.props.textMessageCreationSideEffectsFunc(
          messageInfo,
          threadInfo,
          parentThreadInfo,
        );
      }
      this.pendingSidebarCreationMessageLocalIDs.delete(localID);
      return result;
    } catch (e) {
      const exceptionMessage = getMessageForException(e) ?? '';
      throw new SendMessageError(
        `Exception when sending text message: ${exceptionMessage}`,
        messageInfo.localID ?? '',
        messageInfo.threadID,
      );
    }
  }

  sendMultimediaMessage = async (
    selections: $ReadOnlyArray<NativeMediaSelection>,
    threadInfo: ThreadInfo,
  ) => {
    this.sendCallbacks.forEach(callback => callback());
    const localMessageID = getNextLocalID();
    void this.startThreadCreation(threadInfo);

    if (threadIsPendingSidebar(threadInfo.id)) {
      this.pendingSidebarCreationMessageLocalIDs.add(localMessageID);
    }

    const uploadFileInputs = [],
      media: Array<Media> = [];
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
          thumbHash: null,
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
          thumbnailThumbHash: null,
        });
        ids = { type: 'video', localMediaID, localThumbnailID };
      }
      invariant(ids, `unexpected MediaSelection ${selection.step}`);
      uploadFileInputs.push({ selection, ids });
    }

    const pendingUploads: MessagePendingUploads = {};
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
          { forceMultimediaMessageType: true },
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
    const { localMediaID, localThumbnailID } = ids;
    const start = selection.sendTime;
    const steps: Array<MediaMissionStep> = [selection];
    let encryptionSteps: $ReadOnlyArray<MediaMissionStep> = [];
    let serverID;
    let userTime;
    let errorMessage;
    let reportPromise: ?Promise<$ReadOnlyArray<MediaMissionStep>>;
    const filesToDispose = [];

    const onUploadFinished = async (result: MediaMissionResult) => {
      if (!this.props.mediaReportsEnabled) {
        return errorMessage;
      }
      if (reportPromise) {
        const finalSteps = await reportPromise;
        steps.push(...finalSteps);
        steps.push(...encryptionSteps);
      }
      const totalTime = Date.now() - start;
      userTime = userTime ? userTime : totalTime;
      this.queueMediaMissionReport(
        { localID: localMediaID, localMessageID, serverID },
        { steps, result, totalTime, userTime },
      );
      return errorMessage;
    };
    const onUploadFailed = (message: string) => {
      errorMessage = message;
      this.handleUploadFailure(localMessageID, localMediaID, localThumbnailID);
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
        onUploadFailed(message);
        return await onUploadFinished(processResult);
      }
      if (processResult.shouldDisposePath) {
        filesToDispose.push(processResult.shouldDisposePath);
      }
      processedMedia = processResult;
    } catch (e) {
      onUploadFailed('processing failed');
      return await onUploadFinished({
        success: false,
        reason: 'processing_exception',
        time: Date.now() - processingStart,
        exceptionMessage: getMessageForException(e),
      });
    }

    const encryptionStart = Date.now();
    try {
      const { result: encryptionResult, ...encryptionReturn } =
        await encryptMedia(processedMedia);
      encryptionSteps = encryptionReturn.steps;
      if (!encryptionResult.success) {
        onUploadFailed(encryptionResult.reason);
        return await onUploadFinished(encryptionResult);
      }
      if (encryptionResult.shouldDisposePath) {
        filesToDispose.push(encryptionResult.shouldDisposePath);
      }
      processedMedia = encryptionResult;
    } catch (e) {
      onUploadFailed('encryption failed');
      return await onUploadFinished({
        success: false,
        reason: 'encryption_exception',
        time: Date.now() - encryptionStart,
        exceptionMessage: getMessageForException(e),
      });
    }

    const { uploadURI, filename, mime } = processedMedia;

    const { hasWiFi } = this.props;

    const uploadStart = Date.now();
    let uploadExceptionMessage,
      uploadResult,
      uploadThumbnailResult,
      mediaMissionResult;

    const isThickThread = threadTypeIsThick(threadInfo.type);
    try {
      invariant(
        processedMedia.mediaType === 'encrypted_photo' ||
          processedMedia.mediaType === 'encrypted_video',
        'uploaded media should be encrypted',
      );
      const uploadMetadataToKeyserver = !isThickThread;
      const uploadPromise = this.props.blobServiceUpload({
        uploadInput: {
          blobInput: {
            type: 'uri',
            uri: uploadURI,
            filename: filename,
            mimeType: mime,
          },
          blobHash: processedMedia.blobHash,
          encryptionKey: processedMedia.encryptionKey,
          dimensions: processedMedia.dimensions,
          thumbHash:
            processedMedia.mediaType === 'encrypted_photo'
              ? processedMedia.thumbHash
              : null,
        },
        keyserverOrThreadID: uploadMetadataToKeyserver ? threadInfo.id : null,
        callbacks: {
          blobServiceUploadHandler,
          onProgress: (percent: number) => {
            this.setProgress(
              localMessageID,
              localMediaID,
              'uploading',
              percent,
            );
          },
        },
      });

      const uploadThumbnailPromise: Promise<?BlobServiceUploadResult> =
        (async () => {
          if (processedMedia.mediaType !== 'encrypted_video') {
            return undefined;
          }
          return await this.props.blobServiceUpload({
            uploadInput: {
              blobInput: {
                type: 'uri',
                uri: processedMedia.uploadThumbnailURI,
                filename: replaceExtension(`thumb${filename}`, 'jpg'),
                mimeType: 'image/jpeg',
              },
              blobHash: processedMedia.thumbnailBlobHash,
              encryptionKey: processedMedia.thumbnailEncryptionKey,
              loop: false,
              dimensions: processedMedia.dimensions,
              thumbHash: processedMedia.thumbHash,
            },
            keyserverOrThreadID: uploadMetadataToKeyserver
              ? threadInfo.id
              : null,
            callbacks: {
              blobServiceUploadHandler,
            },
          });
        })();

      [uploadResult, uploadThumbnailResult] = await Promise.all([
        uploadPromise,
        uploadThumbnailPromise,
      ]);

      mediaMissionResult = { success: true };
    } catch (e) {
      uploadExceptionMessage = getMessageForException(e);
      if (uploadExceptionMessage === 'invalid_csat') {
        void this.props.invalidTokenLogOut();
        return undefined;
      }
      onUploadFailed('upload failed');
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
              blobURI: uri,
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
        const { thumbnailEncryptionKey, thumbHash: thumbnailThumbHash } =
          processedMedia;

        if (processedMedia.mediaType === 'encrypted_video') {
          updateMediaPayload = {
            ...updateMediaPayload,
            mediaUpdate: {
              ...updateMediaPayload.mediaUpdate,
              thumbnailID,
              thumbnailBlobURI: thumbnailURI,
              thumbnailEncryptionKey,
              thumbnailThumbHash,
            },
          };
        } else {
          updateMediaPayload = {
            ...updateMediaPayload,
            mediaUpdate: {
              ...updateMediaPayload.mediaUpdate,
              thumbnailID,
              thumbnailURI,
              thumbnailThumbHash,
            },
          };
        }
      } else {
        updateMediaPayload = {
          ...updateMediaPayload,
          mediaUpdate: {
            ...updateMediaPayload.mediaUpdate,
            thumbHash: processedMedia.thumbHash,
          },
        };
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

  performHTTPMultipartUpload = async (
    url: string,
    cookie: ?string,
    sessionID: ?string,
    input: { +[key: string]: mixed },
    options?: ?CallSingleKeyserverEndpointOptions,
  ): Promise<CallSingleKeyserverEndpointResponse> => {
    invariant(
      cookie &&
        input.multimedia &&
        Array.isArray(input.multimedia) &&
        input.multimedia.length === 1 &&
        input.multimedia[0] &&
        typeof input.multimedia[0] === 'object',
      'InputStateContainer.performHTTPMultipartUpload sent incorrect input',
    );
    const { uri, name, type } = input.multimedia[0];
    invariant(
      typeof uri === 'string' &&
        typeof name === 'string' &&
        typeof type === 'string',
      'InputStateContainer.performHTTPMultipartUpload sent incorrect input',
    );

    const parameters: { [key: string]: mixed } = {};
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
        'performHTTPMultipartUpload calls can only handle string values for ' +
          'non-multimedia keys',
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

    let uploadOptions = {
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'multimedia',
      headers: {
        Accept: 'application/json',
      },
      parameters,
    };
    if (Platform.OS === 'android' && path.endsWith('.dat')) {
      // expo-file-system is not able to deduce the MIME type of .dat files, so
      // we specify it explicitly here. Without this, we get this error:
      //   guessContentTypeFromName(file.name) must not be null
      uploadOptions = {
        ...uploadOptions,
        mimeType: 'application/octet-stream',
      };
    }

    const uploadTask = FileSystem.createUploadTask(
      url,
      path,
      uploadOptions,
      uploadProgress => {
        if (options && options.onProgress) {
          const { totalByteSent, totalBytesExpectedToSend } = uploadProgress;
          options.onProgress(totalByteSent / totalBytesExpectedToSend);
        }
      },
    );
    if (options && options.abortHandler) {
      options.abortHandler(() => uploadTask.cancelAsync());
    }
    try {
      const response = await uploadTask.uploadAsync();
      return JSON.parse(response.body);
    } catch (e) {
      throw new Error(
        `Failed to upload blob: ${
          getMessageForException(e) ?? 'unknown error'
        }`,
      );
    }
  };

  handleUploadFailure(
    localMessageID: string,
    localUploadID: string,
    localThumbnailID: ?string,
  ) {
    this.setState(prevState => {
      const uploads = prevState.pendingUploads[localMessageID];

      const upload = uploads[localUploadID];
      const thumbnailUpload = localThumbnailID
        ? uploads[localThumbnailID]
        : undefined;
      if (!upload && !thumbnailUpload) {
        // The upload has been completed before it failed
        return {};
      }

      const newUploads = { ...uploads };
      newUploads[localUploadID] = {
        ...upload,
        failed: true,
        progressPercent: 0,
      };
      if (localThumbnailID) {
        newUploads[localThumbnailID] = {
          processingStep: null,
          ...thumbnailUpload,
          failed: true,
          progressPercent: 0,
        };
      }

      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [localMessageID]: newUploads,
        },
      };
    });
  }

  queueMediaMissionReport(
    ids: { localID: string, localMessageID: string, serverID: ?string },
    mediaMission: MediaMission,
  ) {
    const report: ClientMediaMissionReportCreationRequest = {
      type: reportTypes.MEDIA_MISSION,
      time: Date.now(),
      platformDetails: getConfig().platformDetails,
      mediaMission,
      uploadServerID: ids.serverID,
      uploadLocalID: ids.localID,
      messageLocalID: ids.localMessageID,
      id: generateReportID(),
    };
    this.props.dispatch({
      type: queueReportsActionType,
      payload: {
        reports: [report],
      },
    });
  }

  messageHasUploadFailure = (localMessageID: string): boolean => {
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
  ): Promise<void> => {
    const pendingUploads = this.state.pendingUploads[localMessageID] ?? {};

    const now = Date.now();

    void this.startThreadCreation(threadInfo);

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
      void this.dispatchMultimediaMessageAction(newRawMessageInfo);
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

  waitForCaptureURIUnload(uri: string): Promise<{
    +steps: $ReadOnlyArray<MediaMissionStep>,
    +result: ?string,
  }> {
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

  render(): React.Node {
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
    const callBlobServiceUpload = useBlobServiceUpload();
    const callSendMultimediaMessage =
      useInputStateContainerSendMultimediaMessage();
    const callSendTextMessage = useInputStateContainerSendTextMessage();
    const callNewThinThread = useNewThinThread();
    const callNewThickThread = useNewThickThread();
    const dispatchActionPromise = useDispatchActionPromise();
    const dispatch = useDispatch();
    const mediaReportsEnabled = useIsReportEnabled('mediaReports');
    const staffCanSee = useStaffCanSee();
    const textMessageCreationSideEffectsFunc =
      useMessageCreationSideEffectsFunc<RawTextMessageInfo>(messageTypes.TEXT);
    const callInvalidTokenLogOut = useInvalidCSATLogOut();

    return (
      <InputStateContainer
        {...props}
        viewerID={viewerID}
        messageStoreMessages={messageStoreMessages}
        ongoingMessageCreation={ongoingMessageCreation}
        hasWiFi={hasWiFi}
        mediaReportsEnabled={mediaReportsEnabled}
        calendarQuery={calendarQuery}
        blobServiceUpload={callBlobServiceUpload}
        sendMultimediaMessage={callSendMultimediaMessage}
        sendTextMessage={callSendTextMessage}
        newThinThread={callNewThinThread}
        newThickThread={callNewThickThread}
        dispatchActionPromise={dispatchActionPromise}
        dispatch={dispatch}
        staffCanSee={staffCanSee}
        textMessageCreationSideEffectsFunc={textMessageCreationSideEffectsFunc}
        invalidTokenLogOut={callInvalidTokenLogOut}
      />
    );
  });

export default ConnectedInputStateContainer;
