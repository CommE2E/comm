// @flow

import * as React from 'react';

import Search from '../components/search.react';
import Modal, { type ModalSize } from './modal.react';
import css from './search-modal.css';

type Props = {
  +name: string,
  +searchPlaceholder: string,
  +size?: ModalSize,
  +onClose: () => void,
  +children: (searchText: string) => React.Node,
};

function SearchModal(props: Props): React.Node {
  const [searchText, setSearchText] = React.useState('');
  const { name, searchPlaceholder, size, onClose, children } = props;
  const child = React.useMemo(() => children(searchText), [
    children,
    searchText,
  ]);

  return (
    <Modal name={name} onClose={onClose} size={size}>
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
