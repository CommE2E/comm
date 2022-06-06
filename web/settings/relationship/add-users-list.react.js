// @flow

import * as React from 'react';

import { searchUsers } from 'lib/actions/user-actions.js';
import { userStoreSearchIndex as userStoreSearchIndexSelector } from 'lib/selectors/user-selectors.js';
import type { GlobalAccountUserInfo } from 'lib/types/user-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

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

  // eslint-disable-next-line no-unused-vars
  const [serverSearchResults, setServerSearchResults] = React.useState<
    $ReadOnlyArray<GlobalAccountUserInfo>,
  >([]);
  const callSearchUsers = useServerCall(searchUsers);
  React.useEffect(() => {
    (async () => {
      if (searchText.length === 0) {
        setServerSearchResults([]);
      } else {
        const { userInfos } = await callSearchUsers(searchText);
        setServerSearchResults(userInfos);
      }
    })();
  }, [callSearchUsers, searchText]);

  return null;
}

export default AddUsersList;
