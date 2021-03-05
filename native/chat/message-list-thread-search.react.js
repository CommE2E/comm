// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { AccountUserInfo, UserListItem } from 'lib/types/user-types';

import {TagInput} from '../components/tag-input.react';
import UserList from '../components/user-list.react';
import { useStyles } from '../themes/colors';

type Props = {|
  +usernameInputText: string,
  +updateUsernameInput: (text: string) => void,
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
  +updateTagInput: (items: $ReadOnlyArray<AccountUserInfo>) => void,
  +otherUserInfos: { [id: string]: AccountUserInfo },
  +userSearchResults: $ReadOnlyArray<UserListItem>,
|};

const inputProps = {
  placeholder: 'username',
  autoFocus: true,
  returnKeyType: 'go',
};

export default React.memo<Props>(function MessageListThreadSearch({
  usernameInputText,
  updateUsernameInput,
  userInfoInputArray,
  updateTagInput,
  otherUserInfos,
  userSearchResults,
}) {
  const styles = useStyles(unboundStyles);

  const onUserSelect = React.useCallback(
    (userID: string) => {
      for (const existingUserInfo of userInfoInputArray) {
        if (userID === existingUserInfo.id) {
          return;
        }
      }
      const newUserInfoInputArray = [
        ...userInfoInputArray,
        otherUserInfos[userID],
      ];
      updateUsernameInput('');
      updateTagInput(newUserInfoInputArray);
    },
    [otherUserInfos, updateTagInput, updateUsernameInput, userInfoInputArray],
  );

  const tagDataLabelExtractor = React.useCallback(
    (userInfo: AccountUserInfo) => userInfo.username,
    [],
  );

  const isSearchResultVisible =
    (userInfoInputArray.length === 0 || usernameInputText.length > 0) &&
    userSearchResults.length > 0;

  let separator = null;
  let userList = null;
  let userSelectionAdditionalStyles = styles.userSelectionLimitedHeight;
  if (isSearchResultVisible) {
    userList = (
      <View style={styles.userList}>
        <UserList userInfos={userSearchResults} onSelect={onUserSelect} />
      </View>
    );
    separator = <View style={styles.separator} />;
    userSelectionAdditionalStyles = null;
  }

  return (
    <>
      <View style={[styles.userSelection, userSelectionAdditionalStyles]}>
        <View style={styles.tagInputContainer}>
          <Text style={styles.tagInputLabel}>To: </Text>
          <View style={styles.tagInput}>
            <TagInput
              value={userInfoInputArray}
              onChange={updateTagInput}
              text={usernameInputText}
              onChangeText={updateUsernameInput}
              labelExtractor={tagDataLabelExtractor}
              inputProps={inputProps}
            />
          </View>
        </View>
        {userList}
      </View>
      {separator}
    </>
  );
});

const unboundStyles = {
  userSelection: {
    backgroundColor: 'panelBackground',
    flex: 1,
  },
  userSelectionLimitedHeight: {
    flex: 0,
  },
  tagInputLabel: {
    color: 'modalForegroundSecondaryLabel',
    fontSize: 16,
    paddingLeft: 12,
  },
  tagInputContainer: {
    alignItems: 'center',
    backgroundColor: 'modalForeground',
    borderBottomWidth: 1,
    borderColor: 'modalForegroundBorder',
    flexDirection: 'row',
    paddingVertical: 6,
  },
  tagInput: {
    flex: 1,
  },
  userList: {
    backgroundColor: 'modalBackground',
    paddingLeft: 35,
    paddingRight: 12,
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: 'modalForegroundBorder',
  },
};
