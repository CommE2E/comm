// @flow

import * as React from 'react';

import { useFilteredChildThreads } from 'lib/hooks/child-threads.js';
import { threadIsChannel } from 'lib/shared/thread-utils.js';

import SearchModal from '../../search-modal.react.js';
import Subchannel from './subchannel.react.js';
import css from './subchannels-modal.css';

type ContentProps = {
  +searchText: string,
  +threadID: string,
};

function SubchannelsModalContent(props: ContentProps): React.Node {
  const { searchText, threadID } = props;
  const subchannelList = useFilteredChildThreads(threadID, {
    predicate: threadIsChannel,
    searchText,
  });
  const subchannels = React.useMemo(() => {
    if (!subchannelList.length) {
      return (
        <div className={css.noSubchannels}>
          No matching subchannels were found in the channel!
        </div>
      );
    }
    return subchannelList.map(childThreadItem => (
      <Subchannel
        chatThreadItem={childThreadItem}
        key={childThreadItem.threadInfo.id}
      />
    ));
  }, [subchannelList]);

  return <div className={css.subchannelsListContainer}>{subchannels}</div>;
}
type Props = {
  +threadID: string,
  +onClose: () => void,
};

function SubchannelsModal(props: Props): React.Node {
  const { threadID, onClose } = props;

  const subchannelsContent = React.useCallback(
    (searchText: string) => (
      <SubchannelsModalContent searchText={searchText} threadID={threadID} />
    ),
    [threadID],
  );

  return (
    <SearchModal
      name="Subchannels"
      searchPlaceholder="Search"
      onClose={onClose}
      size="fit-content"
    >
      {subchannelsContent}
    </SearchModal>
  );
}

export default SubchannelsModal;
