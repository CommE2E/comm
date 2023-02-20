// @flow

import invariant from 'invariant';
import _filter from 'lodash/fp/filter.js';
import _flow from 'lodash/fp/flow.js';
import _sortBy from 'lodash/fp/sortBy.js';
import * as React from 'react';
import { View, Text, Alert } from 'react-native';

import { newThreadActionTypes, newThread } from 'lib/actions/thread-actions.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import {
  userInfoSelectorForPotentialMembers,
  userSearchIndexForPotentialMembers,
} from 'lib/selectors/user-selectors.js';
import { getPotentialMemberItems } from 'lib/shared/search-utils.js';
import { threadInFilterList, userIsMember } from 'lib/shared/thread-utils.js';
import {
  type ThreadInfo,
  type ThreadType,
  threadTypes,
} from 'lib/types/thread-types.js';
import { type AccountUserInfo } from 'lib/types/user-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import type { ChatNavigationProp } from './chat.react.js';
import { useNavigateToThread } from './message-list-types.js';
import ParentThreadHeader from './parent-thread-header.react.js';
import LinkButton from '../components/link-button.react.js';
import { createTagInput } from '../components/tag-input.react.js';
import ThreadList from '../components/thread-list.react.js';
import UserList from '../components/user-list.react.js';
import { useCalendarQuery } from '../navigation/nav-selectors.js';
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

export type ComposeSubchannelParams = {
  +threadType: ThreadType,
  +parentThreadInfo: ThreadInfo,
};

type Props = {
  +navigation: ChatNavigationProp<'ComposeSubchannel'>,
  +route: NavigationRoute<'ComposeSubchannel'>,
};
function ComposeSubchannel(props: Props): React.Node {
  const [usernameInputText, setUsernameInputText] = React.useState<string>('');
  const [userInfoInputArray, setUserInfoInputArray] = React.useState<
    $ReadOnlyArray<AccountUserInfo>,
  >([]);
  const [createButtonEnabled, setCreateButtonEnabled] =
    React.useState<boolean>(true);

  const tagInputRef = React.useRef();
  const onUnknownErrorAlertAcknowledged = React.useCallback(() => {
    setUsernameInputText('');
    invariant(tagInputRef.current, 'tagInput should be set');
    tagInputRef.current.focus();
  }, []);

  const waitingOnThreadIDRef = React.useRef<?string>();

  const { threadType, parentThreadInfo } = props.route.params;
  const userInfoInputIDs = userInfoInputArray.map(userInfo => userInfo.id);
  const callNewThread = useServerCall(newThread);
  const calendarQuery = useCalendarQuery();
  const newChatThreadAction = React.useCallback(async () => {
    try {
      const assumedThreadType =
        threadType ?? threadTypes.COMMUNITY_SECRET_SUBTHREAD;
      const query = calendarQuery();
      invariant(
        assumedThreadType === 3 ||
          assumedThreadType === 4 ||
          assumedThreadType === 6 ||
          assumedThreadType === 7,
        "Sidebars and communities can't be created from the thread composer",
      );
      const result = await callNewThread({
        type: assumedThreadType,
        parentThreadID: parentThreadInfo.id,
        initialMemberIDs: userInfoInputIDs,
        color: parentThreadInfo.color,
        calendarQuery: query,
      });
      waitingOnThreadIDRef.current = result.newThreadID;
      return result;
    } catch (e) {
      setCreateButtonEnabled(true);
      Alert.alert(
        'Unknown error',
        'Uhh... try again?',
        [{ text: 'OK', onPress: onUnknownErrorAlertAcknowledged }],
        { cancelable: false },
      );
      throw e;
    }
  }, [
    threadType,
    userInfoInputIDs,
    calendarQuery,
    parentThreadInfo,
    callNewThread,
    onUnknownErrorAlertAcknowledged,
  ]);

  const dispatchActionPromise = useDispatchActionPromise();
  const dispatchNewChatThreadAction = React.useCallback(() => {
    setCreateButtonEnabled(false);
    dispatchActionPromise(newThreadActionTypes, newChatThreadAction());
  }, [dispatchActionPromise, newChatThreadAction]);

  const userInfoInputArrayEmpty = userInfoInputArray.length === 0;
  const onPressCreateThread = React.useCallback(() => {
    if (!createButtonEnabled) {
      return;
    }
    if (userInfoInputArrayEmpty) {
      Alert.alert(
        'Chatting to yourself?',
        'Are you sure you want to create a channel containing only yourself?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: dispatchNewChatThreadAction },
        ],
        { cancelable: true },
      );
    } else {
      dispatchNewChatThreadAction();
    }
  }, [
    createButtonEnabled,
    userInfoInputArrayEmpty,
    dispatchNewChatThreadAction,
  ]);

  const { navigation } = props;
  const { setOptions } = navigation;
  React.useEffect(() => {
    setOptions({
      // eslint-disable-next-line react/display-name
      headerRight: () => (
        <LinkButton
          text="Create"
          onPress={onPressCreateThread}
          disabled={!createButtonEnabled}
        />
      ),
    });
  }, [setOptions, onPressCreateThread, createButtonEnabled]);

  const { setParams } = navigation;
  const parentThreadInfoID = parentThreadInfo.id;
  const reduxParentThreadInfo = useSelector(
    state => threadInfoSelector(state)[parentThreadInfoID],
  );
  React.useEffect(() => {
    if (reduxParentThreadInfo) {
      setParams({ parentThreadInfo: reduxParentThreadInfo });
    }
  }, [reduxParentThreadInfo, setParams]);

  const threadInfos = useSelector(threadInfoSelector);
  const newlyCreatedThreadInfo = waitingOnThreadIDRef.current
    ? threadInfos[waitingOnThreadIDRef.current]
    : null;
  const { pushNewThread } = navigation;
  React.useEffect(() => {
    if (!newlyCreatedThreadInfo) {
      return;
    }

    const waitingOnThreadID = waitingOnThreadIDRef.current;
    if (waitingOnThreadID === null || waitingOnThreadID === undefined) {
      return;
    }
    waitingOnThreadIDRef.current = undefined;

    pushNewThread(newlyCreatedThreadInfo);
  }, [newlyCreatedThreadInfo, pushNewThread]);

  const otherUserInfos = useSelector(userInfoSelectorForPotentialMembers);
  const userSearchIndex = useSelector(userSearchIndexForPotentialMembers);
  const { community } = parentThreadInfo;
  const communityThreadInfo = useSelector(state =>
    community ? threadInfoSelector(state)[community] : null,
  );
  const userSearchResults = React.useMemo(
    () =>
      getPotentialMemberItems(
        usernameInputText,
        otherUserInfos,
        userSearchIndex,
        userInfoInputIDs,
        parentThreadInfo,
        communityThreadInfo,
        threadType,
      ),
    [
      usernameInputText,
      otherUserInfos,
      userSearchIndex,
      userInfoInputIDs,
      parentThreadInfo,
      communityThreadInfo,
      threadType,
    ],
  );

  const existingThreads = React.useMemo(() => {
    if (userInfoInputIDs.length === 0) {
      return [];
    }
    return _flow(
      _filter(
        (threadInfo: ThreadInfo) =>
          threadInFilterList(threadInfo) &&
          threadInfo.parentThreadID === parentThreadInfo.id &&
          userInfoInputIDs.every(userID => userIsMember(threadInfo, userID)),
      ),
      _sortBy(
        ([
          'members.length',
          (threadInfo: ThreadInfo) => (threadInfo.name ? 1 : 0),
        ]: $ReadOnlyArray<string | ((threadInfo: ThreadInfo) => mixed)>),
      ),
    )(threadInfos);
  }, [userInfoInputIDs, threadInfos, parentThreadInfo]);

  const navigateToThread = useNavigateToThread();
  const onSelectExistingThread = React.useCallback(
    (threadID: string) => {
      const threadInfo = threadInfos[threadID];
      navigateToThread({ threadInfo });
    },
    [threadInfos, navigateToThread],
  );

  const onUserSelect = React.useCallback(
    (userID: string) => {
      if (userInfoInputIDs.some(existingUserID => userID === existingUserID)) {
        return;
      }
      setUserInfoInputArray(oldUserInfoInputArray => [
        ...oldUserInfoInputArray,
        otherUserInfos[userID],
      ]);
      setUsernameInputText('');
    },
    [userInfoInputIDs, otherUserInfos],
  );

  const styles = useStyles(unboundStyles);

  let existingThreadsSection = null;
  if (existingThreads.length > 0) {
    existingThreadsSection = (
      <View style={styles.existingThreads}>
        <View style={styles.existingThreadsRow}>
          <Text style={styles.existingThreadsLabel}>Existing channels</Text>
        </View>
        <View style={styles.existingThreadList}>
          <ThreadList
            threadInfos={existingThreads}
            onSelect={onSelectExistingThread}
            itemTextStyle={styles.listItem}
          />
        </View>
      </View>
    );
  }

  const inputProps = React.useMemo(
    () => ({
      ...tagInputProps,
      onSubmitEditing: onPressCreateThread,
    }),
    [onPressCreateThread],
  );
  const userSearchResultWithENSNames = useENSNames(userSearchResults);
  const userInfoInputArrayWithENSNames = useENSNames(userInfoInputArray);
  return (
    <View style={styles.container}>
      <ParentThreadHeader
        parentThreadInfo={parentThreadInfo}
        childThreadType={threadType}
      />
      <View style={styles.userSelectionRow}>
        <Text style={styles.tagInputLabel}>To: </Text>
        <View style={styles.tagInputContainer}>
          <TagInput
            value={userInfoInputArrayWithENSNames}
            onChange={setUserInfoInputArray}
            text={usernameInputText}
            onChangeText={setUsernameInputText}
            labelExtractor={tagDataLabelExtractor}
            inputProps={inputProps}
            ref={tagInputRef}
          />
        </View>
      </View>
      <View style={styles.userList}>
        <UserList
          userInfos={userSearchResultWithENSNames}
          onSelect={onUserSelect}
          itemTextStyle={styles.listItem}
        />
      </View>
      {existingThreadsSection}
    </View>
  );
}

const unboundStyles = {
  container: {
    flex: 1,
  },
  existingThreadList: {
    backgroundColor: 'modalBackground',
    flex: 1,
    paddingRight: 12,
  },
  existingThreads: {
    flex: 1,
  },
  existingThreadsLabel: {
    color: 'modalForegroundSecondaryLabel',
    fontSize: 16,
    paddingLeft: 12,
    textAlign: 'center',
  },
  existingThreadsRow: {
    backgroundColor: 'modalForeground',
    borderBottomWidth: 1,
    borderColor: 'modalForegroundBorder',
    borderTopWidth: 1,
    paddingVertical: 6,
  },
  listItem: {
    color: 'modalForegroundLabel',
  },
  tagInputContainer: {
    flex: 1,
    marginLeft: 8,
    paddingRight: 12,
  },
  tagInputLabel: {
    color: 'modalForegroundSecondaryLabel',
    fontSize: 16,
    paddingLeft: 12,
  },
  userList: {
    backgroundColor: 'modalBackground',
    flex: 1,
    paddingLeft: 35,
    paddingRight: 12,
  },
  userSelectionRow: {
    alignItems: 'center',
    backgroundColor: 'modalForeground',
    borderBottomWidth: 1,
    borderColor: 'modalForegroundBorder',
    flexDirection: 'row',
    paddingVertical: 6,
  },
};

const MemoizedComposeSubchannel: React.ComponentType<Props> =
  React.memo<Props>(ComposeSubchannel);

export default MemoizedComposeSubchannel;
