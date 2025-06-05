// @flow

import invariant from 'invariant';
import * as React from 'react';

import SWMansionIcon from 'lib/components/swmansion-icon.react.js';

import ClearSearchButton from './clear-search-button.react.js';
import css from './search.css';

type Props = {
  ...React.ElementConfig<'input'>,
  +searchText: string,
  +onChangeText: (searchText: string) => mixed,
  +placeholder?: string,
  +onClearText?: () => mixed,
};

function Search(
  props: Props,
  ref: React.RefSetter<HTMLInputElement>,
): React.Node {
  const { searchText, onChangeText, placeholder, onClearText, ...rest } = props;

  const showClearButton = !!searchText;

  const onClear = React.useCallback(() => {
    onChangeText('');
    onClearText?.();
  }, [onChangeText, onClearText]);

  const onChange = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      const { target } = event;
      invariant(target instanceof HTMLInputElement, 'target not input');
      onChangeText(target.value);
    },
    [onChangeText],
  );

  return (
    <div className={css.searchContainer}>
      <div className={css.searchIcon}>
        <SWMansionIcon size={24} icon="search" />
      </div>
      <input
        {...rest}
        id={css.searchInputID}
        className={css.searchInput}
        onChange={onChange}
        value={searchText}
        type="text"
        placeholder={placeholder}
        ref={ref}
      />
      <ClearSearchButton onClick={onClear} active={showClearButton} />
    </div>
  );
}

const ForwardedSearch: React.ComponentType<Props> = React.forwardRef<
  Props,
  HTMLInputElement,
>(Search);

export default ForwardedSearch;
