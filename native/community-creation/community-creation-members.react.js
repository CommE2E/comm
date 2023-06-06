// @flow

import * as React from 'react';
import { ActivityIndicator } from 'react-native';

import {
  changeThreadSettings,
  changeThreadSettingsActionTypes,
} from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import {
  userInfoSelectorForPotentialMembers,
  userSearchIndexForPotentialMembers,
} from 'lib/selectors/user-selectors.js';
import { getPotentialMemberItems } from 'lib/shared/search-utils.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { AccountUserInfo } from 'lib/types/user-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import CommunityCreationContentContainer from './community-creation-content-container.react.js';
import CommunityCreationKeyserverLabel from './community-creation-keyserver-label.react.js';
import type { CommunityCreationNavigationProp } from './community-creation-navigator.react.js';
import RegistrationContainer from '../account/registration/registration-container.react.js';
import { useNavigateToThread } from '../chat/message-list-types.js';
import LinkButton from '../components/link-button.react.js';
import { createTagInput } from '../components/tag-input.react.js';
import UserList from '../components/user-list.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';

export type CommunityCreationMembersScreenParams = {
  +announcement: boolean,
  +threadID: string,
};

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

const changeThreadSettingsLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
);

function CommunityCreationMembers(props: Props): React.Node {
  const { announcement, threadID } = props.route.params;

  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useServerCall(changeThreadSettings);
  const changeThreadSettingsLoadingStatus: LoadingStatus = useSelector(
    changeThreadSettingsLoadingStatusSelector,
  );

  const { navigation } = props;
  const { setOptions } = navigation;

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

  const navigateToThread = useNavigateToThread();
  const threadInfos = useSelector(threadInfoSelector);
  const communityThreadInfo = threadInfos[threadID];

  const addSelectedUsersToCommunity = React.useCallback(() => {
    dispatchActionPromise(
      changeThreadSettingsActionTypes,
      (async () => {
        const result = await callChangeThreadSettings({
          threadID,
          changes: { newMemberIDs: selectedUserIDs },
        });
        navigateToThread({ threadInfo: communityThreadInfo });
        return result;
      })(),
    );
  }, [
    callChangeThreadSettings,
    communityThreadInfo,
    dispatchActionPromise,
    navigateToThread,
    selectedUserIDs,
    threadID,
  ]);

  const exitCommunityCreationFlow = React.useCallback(() => {
    navigateToThread({ threadInfo: communityThreadInfo });
  }, [communityThreadInfo, navigateToThread]);

  const activityIndicatorStyle = React.useMemo(
    () => ({ paddingRight: 20 }),
    [],
  );

  React.useEffect(() => {
    setOptions({
      // eslint-disable-next-line react/display-name
      headerRight: () =>
        changeThreadSettingsLoadingStatus === 'loading' ? (
          <ActivityIndicator size="small" style={activityIndicatorStyle} />
        ) : (
          <LinkButton
            text={selectedUserIDs.length === 0 ? 'Skip' : 'Done'}
            onPress={
              selectedUserIDs.length === 0
                ? exitCommunityCreationFlow
                : addSelectedUsersToCommunity
            }
          />
        ),
    });
  }, [
    activityIndicatorStyle,
    addSelectedUsersToCommunity,
    changeThreadSettingsLoadingStatus,
    exitCommunityCreationFlow,
    selectedUserIDs.length,
    setOptions,
  ]);

  const userSearchResults = React.useMemo(
    () =>
      getPotentialMemberItems(
        usernameInputText,
        otherUserInfos,
        userSearchIndex,
        selectedUserIDs,
        null,
        null,
        announcement
          ? threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT
          : threadTypes.COMMUNITY_ROOT,
      ),
    [
      announcement,
      otherUserInfos,
      selectedUserIDs,
      userSearchIndex,
      usernameInputText,
    ],
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
      <CommunityCreationContentContainer>
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
      </CommunityCreationContentContainer>
    </RegistrationContainer>
  );
}

export default CommunityCreationMembers;
