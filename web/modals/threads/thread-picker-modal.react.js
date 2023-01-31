// @flow

import invariant from 'invariant';
import * as React from 'react';
import { createSelector } from 'reselect';

import { useGlobalThreadSearchIndex } from 'lib/selectors/nav-selectors';
import { onScreenEntryEditableThreadInfos } from 'lib/selectors/thread-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';

import Button from '../../components/button.react';
import Search from '../../components/search.react';
import { useSelector } from '../../redux/redux-utils';
import Modal, { type ModalOverridableProps } from '../modal.react';
import css from './thread-picker-modal.css';

type OptionProps = {
  +threadInfo: ThreadInfo,
  +createNewEntry: (threadID: string) => void,
  +onCloseModal: () => void,
};

function ThreadPickerOption(props: OptionProps) {
  const { threadInfo, createNewEntry, onCloseModal } = props;

  const onClickThreadOption = React.useCallback(() => {
    createNewEntry(threadInfo.id);
    onCloseModal();
  }, [threadInfo.id, createNewEntry, onCloseModal]);

  const splotchColorStyle = React.useMemo(
    () => ({
      backgroundColor: `#${threadInfo.color}`,
    }),
    [threadInfo.color],
  );

  return (
    <div key={threadInfo.id} className={css.threadPickerOptionContainer}>
      <Button
        className={css.threadPickerOptionButton}
        onClick={onClickThreadOption}
      >
        <div style={splotchColorStyle} className={css.threadSplotch} />
        <div className={css.threadNameText}>{threadInfo.uiName}</div>
      </Button>
    </div>
  );
}

type Props = {
  ...ModalOverridableProps,
  +createNewEntry: (threadID: string) => void,
};

function ThreadPickerModal(props: Props): React.Node {
  const { createNewEntry, ...modalProps } = props;

  const onScreenThreadInfos = useSelector(onScreenEntryEditableThreadInfos);
  const searchIndex = useGlobalThreadSearchIndex();

  invariant(
    onScreenThreadInfos.length > 0,
    "ThreadPicker can't be open when onScreenThreadInfos is empty",
  );

  const [searchText, setSearchText] = React.useState<string>('');
  const [searchResults, setSearchResults] = React.useState<Set<string>>(
    new Set(),
  );

  const searchRef = React.useRef();

  React.useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const onChangeSearchText = React.useCallback(
    (text: string) => {
      const results = searchIndex.getSearchResults(text);
      setSearchText(text);
      setSearchResults(new Set(results));
    },
    [searchIndex],
  );

  const listDataSelector = createSelector(
    state => state.onScreenThreadInfos,
    state => state.searchText,
    state => state.searchResults,
    (
      threadInfos: $ReadOnlyArray<ThreadInfo>,
      text: string,
      results: Set<string>,
    ) =>
      text
        ? threadInfos.filter(threadInfo => results.has(threadInfo.id))
        : [...threadInfos],
  );

  const threads = useSelector(() =>
    listDataSelector({
      onScreenThreadInfos,
      searchText,
      searchResults,
    }),
  );

  const threadPickerContent = React.useMemo(() => {
    const options = threads.map(threadInfo => (
      <ThreadPickerOption
        threadInfo={threadInfo}
        createNewEntry={createNewEntry}
        key={threadInfo.id}
        onCloseModal={modalProps.onClose}
      />
    ));

    if (options.length === 0 && searchText.length > 0) {
      return (
        <div className={css.noResultsText}>No results for {searchText}</div>
      );
    } else {
      return options;
    }
  }, [threads, createNewEntry, modalProps.onClose, searchText]);

  return (
    <Modal {...modalProps} size="large">
      <div className={css.container}>
        <Search
          onChangeText={onChangeSearchText}
          searchText={searchText}
          placeholder="Search chats"
          ref={searchRef}
        />
        <div className={css.contentContainer}>{threadPickerContent}</div>
      </div>
    </Modal>
  );
}

export default ThreadPickerModal;
