// @flow

import * as React from 'react';

import css from './chat-thread-list.css';
import ClearSearchButton from './clear-search-button.react';

type ThreadListSearchProps = {
  +searchText: string,
  +onChangeText: (searchText: string) => mixed,
};

function ThreadListSearch(props: ThreadListSearchProps): React.Node {
  const { searchText, onChangeText } = props;

  const showClearButton = !!searchText;

  const onClear = React.useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  const onChange = React.useCallback(
    event => {
      onChangeText(event.target.value);
    },
    [onChangeText],
  );

  return (
    <div className={css.searchContainer}>
      <input
        className={css.searchInput}
        onChange={onChange}
        value={searchText}
        type="text"
        placeholder="Search threads"
      />
      <ClearSearchButton onClick={onClear} active={showClearButton} />
    </div>
  );
}

export default ThreadListSearch;
