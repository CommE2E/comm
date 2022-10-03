// @flow

import invariant from 'invariant';
import * as React from 'react';
import { createSelector } from 'reselect';

import { threadSearchIndex } from 'lib/selectors/nav-selectors';
import { onScreenEntryEditableThreadInfos } from 'lib/selectors/thread-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';

import { useSelector } from '../redux/redux-utils';
import { htmlTargetFromEvent } from '../vector-utils';
import css from './thread-picker.css';

type OptionProps = {
  +threadInfo: ThreadInfo,
  +createNewEntry: (threadID: string) => void,
};
function ThreadPickerOption(props: OptionProps) {
  const { threadInfo, createNewEntry } = props;
  const onClick = React.useCallback(() => createNewEntry(threadInfo.id), [
    threadInfo.id,
    createNewEntry,
  ]);
  const colorStyle = { backgroundColor: `#${props.threadInfo.color}` };

  return (
    <div className={css.option} onClick={onClick}>
      <span className={css.thread}>
        <div className={css.colorPreview} style={colorStyle} />
        <span className={css.threadName}>{props.threadInfo.uiName}</span>
      </span>
    </div>
  );
}

type Props = {
  +createNewEntry: (threadID: string) => void,
  +closePicker: () => void,
};

function ThreadPicker(props: Props): React.Node {
  const { closePicker, createNewEntry } = props;

  const onScreenThreadInfos = useSelector(onScreenEntryEditableThreadInfos);
  const searchIndex = useSelector(state => threadSearchIndex(state));

  invariant(
    onScreenThreadInfos.length > 0,
    "ThreadPicker can't be open when onScreenThreadInfos is empty",
  );

  const pickerDivRef = React.useRef<?HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    invariant(pickerDivRef, 'pickerDivRef must be set');
    const { current } = pickerDivRef;
    current?.focus();
  }, []);

  const [searchText, setSearchText] = React.useState<string>('');
  const [searchResults, setSearchResults] = React.useState<Set<string>>(
    new Set(),
  );

  const onPickerKeyDown = React.useCallback(
    (event: SyntheticKeyboardEvent<HTMLDivElement>) => {
      if (event.keyCode === 27) {
        // esc
        closePicker();
      }
    },
    [closePicker],
  );

  const onMouseDown = React.useCallback(
    (event: SyntheticEvent<HTMLDivElement>) => {
      const target = htmlTargetFromEvent(event);
      invariant(pickerDivRef, 'pickerDivRef must be set');
      if (pickerDivRef.current?.contains(target)) {
        // This prevents onBlur from firing
        event.preventDefault();
      }
    },
    [],
  );

  // eslint-disable-next-line no-unused-vars
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

  const options = React.useMemo(() => {
    return threads.map(threadInfo => (
      <ThreadPickerOption
        threadInfo={threadInfo}
        createNewEntry={createNewEntry}
        key={threadInfo.id}
      />
    ));
  }, [threads, createNewEntry]);

  return (
    <div
      className={css.container}
      tabIndex="0"
      ref={pickerDivRef}
      onBlur={closePicker}
      onKeyDown={onPickerKeyDown}
      onMouseDown={onMouseDown}
    >
      {options}
    </div>
  );
}

export default ThreadPicker;
