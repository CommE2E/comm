// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { CommunityInfo } from 'lib/types/community-types.js';

import css from './tag-farcaster-channel-modal.css';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +communityID: string,
};

function TagFarcasterChannelModal(props: Props): React.Node {
  const { communityID } = props;

  const { popModal } = useModalContext();

  const communityInfo: ?CommunityInfo = useSelector(
    state => state.communityStore.communityInfos[communityID],
  );

  const channelNameTextContent = React.useMemo(() => {
    if (!communityInfo?.farcasterChannelID) {
      return (
        <div className={css.noChannelText}>No Farcaster channel tagged</div>
      );
    }

    return (
      <div className={css.farcasterChannelText}>
        /{communityInfo.farcasterChannelID}
      </div>
    );
  }, [communityInfo?.farcasterChannelID]);

  const tagFarcasterChannelModal = React.useMemo(
    () => (
      <Modal name="Tag a Farcaster channel" onClose={popModal} size="large">
        <div className={css.modalDescription}>
          Tag a Farcaster channel so followers can find your Comm community!
        </div>
        <div className={css.farcasterChannelTitle}>Selected channel:</div>
        {channelNameTextContent}
      </Modal>
    ),
    [channelNameTextContent, popModal],
  );

  return tagFarcasterChannelModal;
}

export default TagFarcasterChannelModal;
