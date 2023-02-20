// @flow

import * as React from 'react';

import Modal, { type ModalOverridableProps } from './modal.react.js';
import css from './search-modal.css';
import Search from '../components/search.react.js';

type Props = {
  ...ModalOverridableProps,
  +children: (searchText: string) => React.Node,
  +searchPlaceholder: string,
};

function SearchModal(props: Props): React.Node {
  const [searchText, setSearchText] = React.useState('');
  const { children, searchPlaceholder, ...modalProps } = props;
  const child = React.useMemo(
    () => children(searchText),
    [children, searchText],
  );

  return (
    <Modal {...modalProps}>
      <div className={css.container}>
        <Search
          onChangeText={setSearchText}
          searchText={searchText}
          placeholder={searchPlaceholder}
        />
        {child}
      </div>
    </Modal>
  );
}

export default SearchModal;
