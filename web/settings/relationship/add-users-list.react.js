// @flow

import * as React from 'react';

import { userStoreSearchIndex as userStoreSearchIndexSelector } from 'lib/selectors/user-selectors.js';

import { useSelector } from '../../redux/redux-utils.js';

type Props = {
  +searchText: string,
};

function AddUsersList(props: Props): React.Node {
  const { searchText } = props;

  const userStoreSearchIndex = useSelector(userStoreSearchIndexSelector);
  // eslint-disable-next-line no-unused-vars
  const [userStoreSearchResults, setUserStoreSearchResults] = React.useState<
    $ReadOnlySet<string>,
  >(new Set(userStoreSearchIndex.getSearchResults(searchText)));
  React.useEffect(() => {
    setUserStoreSearchResults(
      new Set(userStoreSearchIndex.getSearchResults(searchText)),
    );
  }, [searchText, userStoreSearchIndex]);

  return null;
}

export default AddUsersList;
