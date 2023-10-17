// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import UserProfileModal from './user-profile-modal.react.js';

type Props = {
  +userID: string,
};

function usePushUserProfileModal(props: Props): () => mixed {
  const { userID } = props;

  const { pushModal } = useModalContext();

  return React.useCallback(() => {
    pushModal(<UserProfileModal userID={userID} />);
  }, [pushModal, userID]);
}

export { usePushUserProfileModal };
