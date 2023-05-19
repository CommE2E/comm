// @flow

import * as React from 'react';

import css from './community-creation-members-modal.css';
import CommIcon from '../../CommIcon.react.js';
import Search from '../../components/search.react.js';
import Modal from '../../modals/modal.react.js';
import { AddMembersModalContent } from '../../modals/threads/members/add-members-modal.react.js';

type Props = {
  +threadID: string,
  +onClose: () => void,
};
function CommunityCreationMembersModal(props: Props): React.Node {
  const { threadID, onClose } = props;
  const [searchText, setSearchText] = React.useState('');

  return (
    <Modal
      name="Add members to the community"
      subtitle="You may also add members later"
      onClose={onClose}
      size="large"
    >
      <div className={css.ancestryContainer}>
        <p>within</p>
        <div className={css.keyserverContainer}>
          <CommIcon icon="cloud-filled" size={18} color="white" />
          <div className={css.keyserverName}>ashoat</div>
        </div>
      </div>
      <div className={css.container}>
        <Search
          onChangeText={setSearchText}
          searchText={searchText}
          placeholder="Search members"
        />
        <AddMembersModalContent
          searchText={searchText}
          threadID={threadID}
          onClose={onClose}
        />
      </div>
    </Modal>
  );
}

export default CommunityCreationMembersModal;
