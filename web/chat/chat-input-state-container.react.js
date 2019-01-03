// @flow

import type { AppState } from '../redux-setup';
import type { PendingMultimediaUpload } from 'lib/types/media-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import _memoize from 'lodash/memoize';

import { connect } from 'lib/utils/redux-utils';

import ChatMessageList from './chat-message-list.react';
import { validateFile } from '../utils/media-utils';

type Props = {|
  // Redux state
  activeChatThreadID: ?string,
|};
type State = {|
  pendingUploads: {[threadID: string]: $ReadOnlyArray<PendingMultimediaUpload>},
  drafts: {[threadID: string]: string},
|};
class ChatInputStateContainer extends React.PureComponent<Props, State> {

  static propTypes = {
    activeChatThreadID: PropTypes.string,
  };
  state = {
    pendingUploads: {},
    drafts: {},
  };

  chatInputStateSelector = _memoize((threadID: string) => createSelector(
    (state: State) => state.pendingUploads[threadID],
    (state: State) => state.drafts[threadID],
    (
      pendingUploads: ?$ReadOnlyArray<PendingMultimediaUpload>,
      draft: ?string,
    ) => ({
      pendingUploads: pendingUploads ? pendingUploads : [],
      draft: draft ? draft : "",
      appendFiles: (files: $ReadOnlyArray<File>) =>
        this.appendFiles(threadID, files),
      removePendingUpload: (pendingUpload: PendingMultimediaUpload) =>
        this.removePendingUpload(threadID, pendingUpload),
      clearPendingUploads: () => this.clearPendingUploads(threadID),
      setDraft: (draft: string) => this.setDraft(threadID, draft),
      setProgress: (percent: number) => this.setProgress(threadID, percent),
    }),
  ));

  async appendFiles(threadID: string, files: $ReadOnlyArray<File>) {
    const validationResult = await Promise.all(files.map(validateFile));
    const validatedFileInfo = validationResult.filter(Boolean);
    if (validatedFileInfo.length === 0) {
      return;
    }
    const newUploads = validatedFileInfo.map(({ file, mediaType }) => ({
      file,
      mediaType,
      uri: URL.createObjectURL(file),
      progressPercent: 0,
    }));
    this.setState(prevState => {
      const prevUploads = prevState.pendingUploads[threadID];
      const mergedUploads = prevUploads
        ? [ ...prevUploads, ...newUploads ]
        : newUploads;
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [threadID]: mergedUploads,
        },
      };
    });
  }

  removePendingUpload(
    threadID: string,
    pendingUpload: PendingMultimediaUpload,
  ) {
    this.setState(prevState => {
      const currentPendingUploads = prevState.pendingUploads[threadID];
      if (!currentPendingUploads) {
        return {};
      }
      const newPendingUploads = currentPendingUploads.filter(
        candidate => candidate !== pendingUpload,
      );
      if (newPendingUploads.length === currentPendingUploads.length) {
        return {};
      }
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [threadID]: newPendingUploads,
        },
      };
    });
  }

  clearPendingUploads(threadID: string) {
    this.setState(prevState => {
      if (prevState.pendingUploads[threadID].length === 0) {
        return {};
      }
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [threadID]: [],
        },
      };
    });
  }

  setDraft(threadID: string, draft: string) {
    this.setState(prevState => ({
      drafts: {
        ...prevState.drafts,
        [threadID]: draft,
      },
    }));
  }

  setProgress(threadID: string, percent: number) {
    this.setState(prevState => {
      const pendingUploads = prevState.pendingUploads[threadID];
      if (!pendingUploads) {
        return {};
      }
      const newPendingUploads = pendingUploads.map(
        pendingUpload => ({ ...pendingUpload, progressPercent: percent }),
      );
      return {
        pendingUploads: {
          ...prevState.pendingUploads,
          [threadID]: newPendingUploads,
        },
      };
    });
  }

  render() {
    const { activeChatThreadID } = this.props;
    const chatInputState = activeChatThreadID
      ? this.chatInputStateSelector(activeChatThreadID)(this.state)
      : null;
    return (
      <ChatMessageList
        activeChatThreadID={activeChatThreadID}
        chatInputState={chatInputState}
      />
    );
  }

}

export default connect((state: AppState) => ({
  activeChatThreadID: state.navInfo.activeChatThreadID,
}))(ChatInputStateContainer);
