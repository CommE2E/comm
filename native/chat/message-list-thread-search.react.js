// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import { useResolvableNames } from 'lib/hooks/ens-cache.js';
import { extractFIDFromUserID } from 'lib/shared/id-utils.js';
import { notFriendNotice } from 'lib/shared/search-utils.js';
import type { AccountUserInfo, UserListItem } from 'lib/types/user-types.js';
import { supportsFarcasterDCs } from 'lib/utils/services-utils.js';

import { createTagInput } from '../components/tag-input.react.js';
import UserList from '../components/user-list.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

const TagInput = createTagInput<AccountUserInfo>();

type Props = {
  +usernameInputText: string,
  +updateUsernameInput: (text: string) => void,
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
  +updateTagInput: (items: $ReadOnlyArray<AccountUserInfo>) => void,
  +resolveToUser: (user: AccountUserInfo) => Promise<void>,
  +userSearchResults: $ReadOnlyArray<UserListItem>,
};

const inputProps = {
  placeholder: 'username',
  autoFocus: true,
  returnKeyType: 'go',
};

const MessageListThreadSearch: React.ComponentType<Props> = React.memo(
  function MessageListThreadSearch({
    usernameInputText,
    updateUsernameInput,
    userInfoInputArray,
    updateTagInput,
    resolveToUser,
    userSearchResults,
  }) {
    const styles = useStyles(unboundStyles);

    const [userListItems, nonFriends] = React.useMemo(() => {
      const nonFriendsSet = new Set<string>();
      if (userInfoInputArray.length > 0) {
        return [userSearchResults, nonFriendsSet];
      }

      const userListItemsArr = [];
      for (const searchResult of userSearchResults) {
        if (searchResult.notice !== notFriendNotice) {
          userListItemsArr.push(searchResult);
          continue;
        }
        nonFriendsSet.add(searchResult.id);
        const { alert, ...rest } = searchResult;
        userListItemsArr.push(rest);
      }
      return [userListItemsArr, nonFriendsSet];
    }, [userSearchResults, userInfoInputArray]);

    const viewerID = useSelector(state => state.currentUserInfo?.id);
    const onUserSelect = React.useCallback(
      async (userInfo: AccountUserInfo) => {
        for (const existingUserInfo of userInfoInputArray) {
          if (userInfo.id === existingUserInfo.id) {
            return;
          }
        }
        const isFarcasterUser =
          supportsFarcasterDCs && !!extractFIDFromUserID(userInfo.id);
        if (
          (!isFarcasterUser && nonFriends.has(userInfo.id)) ||
          userInfo.id === viewerID
        ) {
          await resolveToUser(userInfo);
          return;
        }
        const newUserInfoInputArray = [...userInfoInputArray, userInfo];
        updateUsernameInput('');
        updateTagInput(newUserInfoInputArray);
      },
      [
        userInfoInputArray,
        nonFriends,
        updateTagInput,
        resolveToUser,
        updateUsernameInput,
        viewerID,
      ],
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
    const userListItemsWithENSNames = useResolvableNames(userListItems);
    if (isSearchResultVisible) {
      userList = (
        <View style={styles.userList}>
          <UserList
            userInfos={userListItemsWithENSNames}
            onSelect={onUserSelect}
          />
        </View>
      );
      separator = <View style={styles.separator} />;
      userSelectionAdditionalStyles = null;
    }

    const userInfoInputArrayWithENSNames =
      useResolvableNames(userInfoInputArray);
    return (
      <>
        <View style={[styles.userSelection, userSelectionAdditionalStyles]}>
          <View style={styles.tagInputContainer}>
            <Text style={styles.tagInputLabel}>To: </Text>
            <View style={styles.tagInput}>
              <TagInput
                value={userInfoInputArrayWithENSNames}
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
  },
);

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

export default MessageListThreadSearch;
