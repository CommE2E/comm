// @flow

import * as React from 'react';

import {
  userInfoSelectorForPotentialMembers,
  userSearchIndexForPotentialMembers,
} from 'lib/selectors/user-selectors.js';
import { getPotentialMemberItems } from 'lib/shared/search-utils.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { AccountUserInfo } from 'lib/types/user-types.js';

import CommunityCreationKeyserverLabel from './community-creation-keyserver-label.react.js';
import type { CommunityCreationNavigationProp } from './community-creation-navigator.react.js';
import RegistrationContainer from '../account/registration/registration-container.react.js';
import RegistrationContentContainer from '../account/registration/registration-content-container.react.js';
import { createTagInput } from '../components/tag-input.react.js';
import UserList from '../components/user-list.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

const TagInput = createTagInput<AccountUserInfo>();
const tagInputProps = {
  placeholder: 'username',
  autoFocus: true,
  returnKeyType: 'go',
};
const tagDataLabelExtractor = (userInfo: AccountUserInfo) => userInfo.username;

type Props = {
  +navigation: CommunityCreationNavigationProp<'CommunityCreationMembers'>,
  +route: NavigationRoute<'CommunityCreationMembers'>,
};

// eslint-disable-next-line no-unused-vars
function CommunityCreationMembers(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const otherUserInfos = useSelector(userInfoSelectorForPotentialMembers);
  const userSearchIndex = useSelector(userSearchIndexForPotentialMembers);

  const [usernameInputText, setUsernameInputText] = React.useState<string>('');
  const [selectedUsers, setSelectedUsers] = React.useState<
    $ReadOnlyArray<AccountUserInfo>,
  >([]);

  const selectedUserIDs = React.useMemo(
    () => selectedUsers.map(userInfo => userInfo.id),
    [selectedUsers],
  );

  const userSearchResults = React.useMemo(
    () =>
      getPotentialMemberItems(
        usernameInputText,
        otherUserInfos,
        userSearchIndex,
        selectedUserIDs,
        null,
        null,
        threadTypes.COMMUNITY_ROOT,
      ),
    [otherUserInfos, selectedUserIDs, userSearchIndex, usernameInputText],
  );

  const onSelectUser = React.useCallback(
    userID => {
      if (selectedUserIDs.some(existingUserID => userID === existingUserID)) {
        return;
      }
      setSelectedUsers(oldUserInfoInputArray => [
        ...oldUserInfoInputArray,
        otherUserInfos[userID],
      ]);
      setUsernameInputText('');
    },
    [otherUserInfos, selectedUserIDs],
  );

  const tagInputRef = React.useRef();

  return (
    <RegistrationContainer>
      <RegistrationContentContainer style={styles.containerPaddingOverride}>
        <CommunityCreationKeyserverLabel />
        <TagInput
          value={selectedUsers}
          onChange={setSelectedUsers}
          text={usernameInputText}
          onChangeText={setUsernameInputText}
          labelExtractor={tagDataLabelExtractor}
          inputProps={tagInputProps}
          ref={tagInputRef}
        />
        <UserList userInfos={userSearchResults} onSelect={onSelectUser} />
      </RegistrationContentContainer>
    </RegistrationContainer>
  );
}

const unboundStyles = {
  containerPaddingOverride: {
    padding: 0,
  },
};

export default CommunityCreationMembers;
