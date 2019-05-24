// @flow

import type {
  PendingMultimediaUploads,
  ChatInputState,
} from './chat-input-state';
import type { GalleryImageInfo } from '../media/image-gallery-image.react';
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
import type { NativeImageInfo } from '../utils/media-utils';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import { StyleSheet } from 'react-native';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { createSelector } from 'reselect';

import { connect } from 'lib/utils/redux-utils';
import {
  uploadMultimedia,
} from 'lib/actions/upload-actions';
import {
  createLocalMultimediaMessageActionType,
  sendMultimediaMessageActionTypes,
  sendMultimediaMessage,
} from 'lib/actions/message-actions';

import ChatNavigator from './chat-navigator.react';
import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react';
import MessageStorePruner from './message-store-pruner.react';
import { ChatInputStateContext } from './chat-input-state';
import { validateMedia } from '../utils/media-utils';

let nextLocalUploadID = 0;
type ImageInfo = {|
  ...NativeImageInfo,
  localID: string,
|};

type Props = {|
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
class Chat extends React.PureComponent<Props, State> {

  static propTypes = {
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
    inputImageInfos: $ReadOnlyArray<GalleryImageInfo>,
  ) => {
    const validationResults = await Promise.all(
      inputImageInfos.map(validateMedia),
    );
    const imageInfos = validationResults.filter(Boolean).map(imageInfo => ({
      ...imageInfo,
      localID: `localUpload${nextLocalUploadID++}`,
    }));
    const localMessageID = `local${this.props.nextLocalID}`;

    const pendingUploads = {};
    for (let { localID } of imageInfos) {
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

    await Promise.all(
      imageInfos.map(imageInfo => this.uploadFile(localMessageID, imageInfo)),
    );
  }

  async uploadFile(localMessageID: string, imageInfo: ImageInfo) {
    const { localID, uri, name, mime } = imageInfo;
    let result;
    try {
      result = await this.props.uploadMultimedia(
        { uri, name, type: mime },
        (percent: number) => this.setProgress(
          localMessageID,
          localID,
          percent,
        ),
      );
    } catch (e) {
      this.handleUploadFailure(localMessageID, localID, e);
      return;
    }
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
  }

  render() {
    const chatInputState = this.chatInputStateSelector(this.state);
    return (
      <ChatInputStateContext.Provider value={chatInputState}>
        <KeyboardAvoidingView style={styles.keyboardAvoidingView}>
          <ChatNavigator {...this.props} />
          <MessageStorePruner />
        </KeyboardAvoidingView>
      </ChatInputStateContext.Provider>
    );
  }

}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
});

const ReduxWrappedChat = connect(
  (state: AppState) => ({
    viewerID: state.currentUserInfo && state.currentUserInfo.id,
    nextLocalID: state.nextLocalID,
    messageStoreMessages: state.messageStore.messages,
  }),
  { uploadMultimedia, sendMultimediaMessage },
)(Chat);

hoistNonReactStatics(ReduxWrappedChat, ChatNavigator);

export default ReduxWrappedChat;
