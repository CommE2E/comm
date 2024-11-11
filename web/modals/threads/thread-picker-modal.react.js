// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useGlobalThreadSearchIndex } from 'lib/components/global-search-index-provider.react.js';
import {
  useOnScreenEntryEditableThreadInfos,
  reorderThreadSearchResults,
} from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import css from './thread-picker-modal.css';
import ThreadAvatar from '../../avatars/thread-avatar.react.js';
import Button from '../../components/button.react.js';
import Search from '../../components/search.react.js';
import Modal, { type ModalOverridableProps } from '../modal.react.js';

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

  const { uiName } = useResolvedThreadInfo(threadInfo);

  return (
    <div key={threadInfo.id} className={css.threadPickerOptionContainer}>
      <Button
        className={css.threadPickerOptionButton}
        onClick={onClickThreadOption}
      >
        <ThreadAvatar size="M" threadInfo={threadInfo} />
        <div className={css.threadNameText}>{uiName}</div>
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

  const onScreenThreadInfos = useOnScreenEntryEditableThreadInfos();
  const searchIndex = useGlobalThreadSearchIndex();

  invariant(
    onScreenThreadInfos.length > 0,
    "ThreadPicker can't be open when onScreenThreadInfos is empty",
  );

  const [searchText, setSearchText] = React.useState<string>('');
  const [searchResults, setSearchResults] = React.useState<
    $ReadOnlyArray<ThreadInfo>,
  >([]);

  const searchRef = React.useRef<?HTMLInputElement>();

  React.useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const onChangeSearchText = React.useCallback(
    (text: string) => {
      const results = searchIndex.getSearchResults(text);
      setSearchText(text);
      const threadInfoResults = reorderThreadSearchResults(
        onScreenThreadInfos,
        results,
      );
      setSearchResults(threadInfoResults);
    },
    [searchIndex, onScreenThreadInfos],
  );

  const threads = React.useMemo(
    () => (searchText ? searchResults : onScreenThreadInfos),
    [searchText, onScreenThreadInfos, searchResults],
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
