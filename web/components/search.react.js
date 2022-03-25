// @flow

import * as React from 'react';

import ClearSearchButton from './clear-search-button.react';
import css from './search.css';

type Props = {
  +searchText: string,
  +onChangeText: (searchText: string) => mixed,
  +placeholder?: string,
};

function Search(props: Props): React.Node {
  const { searchText, onChangeText, placeholder } = props;

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
        placeholder={placeholder}
      />
      <ClearSearchButton onClick={onClear} active={showClearButton} />
    </div>
  );
}

export default Search;
