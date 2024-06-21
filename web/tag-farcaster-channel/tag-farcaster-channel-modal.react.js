// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import {
  tagFarcasterChannelCopy,
  tagFarcasterChannelErrorMessages,
} from 'lib/shared/community-utils.js';
import type { CommunityInfo } from 'lib/types/community-types.js';

import CreateFarcasterChannelTagModal from './create-farcaster-channel-tag-modal.react.js';
import RemoveTagButton from './remove-tag-button.react.js';
import css from './tag-farcaster-channel-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +communityID: string,
};

function TagFarcasterChannelModal(props: Props): React.Node {
  const { communityID } = props;

  const { popModal, pushModal } = useModalContext();

  const communityInfo: ?CommunityInfo = useSelector(
    state => state.communityStore.communityInfos[communityID],
  );

  const [removeTagError, setRemoveTagError] = React.useState<?string>();

  const openCreateFarcasterChannelTagModal = React.useCallback(
    () =>
      pushModal(<CreateFarcasterChannelTagModal communityID={communityID} />),
    [communityID, pushModal],
  );

  const channelNameTextContent = React.useMemo(() => {
    if (!communityInfo?.farcasterChannelID) {
      return (
        <div className={css.noChannelText}>
          {tagFarcasterChannelCopy.NO_CHANNEL_TAGGED}
        </div>
      );
    }

    return (
      <div className={css.farcasterChannelText}>
        /{communityInfo.farcasterChannelID}
      </div>
    );
  }, [communityInfo?.farcasterChannelID]);

  const primaryButton = React.useMemo(() => {
    if (communityInfo?.farcasterChannelID) {
      return (
        <RemoveTagButton
          communityID={communityID}
          channelID={communityInfo.farcasterChannelID}
          setError={setRemoveTagError}
        />
      );
    }

    return (
      <Button
        variant="filled"
        buttonColor={buttonThemes.standard}
        onClick={openCreateFarcasterChannelTagModal}
      >
        Tag channel
      </Button>
    );
  }, [
    communityID,
    communityInfo?.farcasterChannelID,
    openCreateFarcasterChannelTagModal,
  ]);

  const errorMessageClassName = classNames(css.errorMessage, {
    [css.errorMessageVisible]: removeTagError,
  });

  const errorMessage =
    removeTagError && tagFarcasterChannelErrorMessages[removeTagError]
      ? tagFarcasterChannelErrorMessages[removeTagError]
      : 'Unknown error.';

  const tagFarcasterChannelModal = React.useMemo(
    () => (
      <Modal
        name="Tag a Farcaster channel"
        onClose={popModal}
        size="large"
        primaryButton={primaryButton}
      >
        <div className={css.modalDescription}>
          {tagFarcasterChannelCopy.DESCRIPTION}
        </div>
        <div className={css.farcasterChannelTitle}>
          {tagFarcasterChannelCopy.CHANNEL_NAME_HEADER}
        </div>
        {channelNameTextContent}
        <div className={errorMessageClassName}>{errorMessage}</div>
      </Modal>
    ),
    [
      channelNameTextContent,
      errorMessage,
      errorMessageClassName,
      popModal,
      primaryButton,
    ],
  );

  return tagFarcasterChannelModal;
}

export default TagFarcasterChannelModal;
