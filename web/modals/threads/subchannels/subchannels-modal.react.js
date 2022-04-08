// @flow

import * as React from 'react';

import { useFilteredChatListData } from 'lib/selectors/chat-selectors';
import { threadSearchIndex } from 'lib/selectors/nav-selectors';
import { childThreadInfos } from 'lib/selectors/thread-selectors';
import { threadIsChannel } from 'lib/shared/thread-utils';

import { useSelector } from '../../../redux/redux-utils';
import SearchModal from '../../search-modal.react';
import Subchannel from './subchannel.react';
import css from './subchannels-modal.css';

type ContentProps = {
  +searchText: string,
  +threadID: string,
};

function SubchannelsModalContent(props: ContentProps): React.Node {
  const { searchText, threadID } = props;
  const childThreads = useSelector(state => childThreadInfos(state)[threadID]);
  const subchannelIDs = React.useMemo(() => {
    if (!childThreads) {
      return new Set();
    }
    return new Set(
      childThreads.filter(threadIsChannel).map(threadInfo => threadInfo.id),
    );
  }, [childThreads]);

  const filterSubchannels = React.useCallback(
    thread => subchannelIDs.has(thread?.id),
    [subchannelIDs],
  );
  const allSubchannelsChatList = useFilteredChatListData(filterSubchannels);

  const searchIndex = useSelector(threadSearchIndex);

  const searchResultIDs = React.useMemo(
    () => searchIndex.getSearchResults(searchText),
    [searchIndex, searchText],
  );

  const searchTextExists = !!searchText.length;
  const filteredSubchannelsChatList = React.useMemo(() => {
    if (!searchTextExists) {
      return allSubchannelsChatList;
    }
    return allSubchannelsChatList.filter(item =>
      searchResultIDs.includes(item.threadInfo.id),
    );
  }, [allSubchannelsChatList, searchResultIDs, searchTextExists]);

  const subchannels = React.useMemo(() => {
    if (!filteredSubchannelsChatList.length) {
      return (
        <div className={css.noSubchannels}>
          No matching subchannels were found in the thread!
        </div>
      );
    }
    return filteredSubchannelsChatList.map(childThreadItem => (
      <Subchannel
        chatThreadItem={childThreadItem}
        key={childThreadItem.threadInfo.id}
      />
    ));
  }, [filteredSubchannelsChatList]);

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
    >
      {subchannelsContent}
    </SearchModal>
  );
}

export default SubchannelsModal;
