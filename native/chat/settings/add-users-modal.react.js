// @flow

import * as React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { changeThreadSettingsActionTypes } from 'lib/actions/thread-action-types.js';
import { useResolvableNames } from 'lib/hooks/ens-cache.js';
import { useChangeThreadSettings } from 'lib/hooks/thread-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { userInfoSelectorForPotentialMembers } from 'lib/selectors/user-selectors.js';
import { useAddDMThreadMembers } from 'lib/shared/dm-ops/dm-op-utils.js';
import { usePotentialMemberItems } from 'lib/shared/search-utils.js';
import { threadActualMembers } from 'lib/shared/thread-utils.js';
import { threadSpecs } from 'lib/shared/threads/thread-specs.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { type AccountUserInfo } from 'lib/types/user-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import Button from '../../components/button.react.js';
import Modal from '../../components/modal.react.js';
import {
  type BaseTagInput,
  createTagInput,
} from '../../components/tag-input.react.js';
import UserList from '../../components/user-list.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles } from '../../themes/colors.js';
import { unknownErrorAlertDetails } from '../../utils/alert-messages.js';
import Alert from '../../utils/alert.js';

const TagInput = createTagInput<AccountUserInfo>();

const tagInputProps = {
  placeholder: 'Select users to add',
  autoFocus: true,
  returnKeyType: 'go',
};

const tagDataLabelExtractor = (userInfo: AccountUserInfo) => userInfo.username;

export type AddUsersModalParams = {
  +presentedFrom: string,
  +threadInfo: ThreadInfo,
};

type Props = {
  +navigation: RootNavigationProp<'AddUsersModal'>,
  +route: NavigationRoute<'AddUsersModal'>,
};
function AddUsersModal(props: Props): React.Node {
  const [usernameInputText, setUsernameInputText] = React.useState<string>('');
  const [userInfoInputArray, setUserInfoInputArray] = React.useState<
    $ReadOnlyArray<AccountUserInfo>,
  >([]);

  const tagInputRef = React.useRef<?BaseTagInput<AccountUserInfo>>();
  const onUnknownErrorAlertAcknowledged = React.useCallback(() => {
    setUsernameInputText('');
    setUserInfoInputArray([]);
    tagInputRef.current?.focus();
  }, []);

  const { navigation } = props;
  const { goBackOnce } = navigation;
  const close = React.useCallback(() => {
    goBackOnce();
  }, [goBackOnce]);

  const callChangeThreadSettings = useChangeThreadSettings();
  const userInfoInputIDs = userInfoInputArray.map(userInfo => userInfo.id);
  const { route } = props;
  const { threadInfo } = route.params;

  const inputLength = userInfoInputArray.length;
  const dispatchActionPromise = useDispatchActionPromise();
  const userInfoInputArrayEmpty = inputLength === 0;
  const addDMThreadMembers = useAddDMThreadMembers();

  const onPressAdd = React.useCallback(async () => {
    if (userInfoInputArrayEmpty) {
      return;
    }

    try {
      await threadSpecs[threadInfo.type].protocol().addThreadMembers(
        { newMemberIDs: userInfoInputIDs, threadInfo },
        {
          dmAddThreadMembers: addDMThreadMembers,
          changeThreadSettings: callChangeThreadSettings,
          dispatchActionPromise,
        },
      );
      close();
    } catch (e) {
      Alert.alert(
        unknownErrorAlertDetails.title,
        unknownErrorAlertDetails.message,
        [{ text: 'OK', onPress: onUnknownErrorAlertAcknowledged }],
        { cancelable: false },
      );
    }
  }, [
    userInfoInputArrayEmpty,
    threadInfo,
    dispatchActionPromise,
    addDMThreadMembers,
    userInfoInputIDs,
    callChangeThreadSettings,
    close,
    onUnknownErrorAlertAcknowledged,
  ]);

  const changeThreadSettingsLoadingStatus = useSelector(
    createLoadingStatusSelector(changeThreadSettingsActionTypes),
  );
  const isLoading = changeThreadSettingsLoadingStatus === 'loading';

  const styles = useStyles(unboundStyles);

  let addButton = null;
  if (inputLength > 0) {
    let activityIndicator = null;
    if (isLoading) {
      activityIndicator = (
        <View style={styles.activityIndicator}>
          <ActivityIndicator color="white" />
        </View>
      );
    }
    const addButtonText = `Add (${inputLength})`;
    addButton = (
      <Button
        onPress={onPressAdd}
        style={styles.addButton}
        disabled={isLoading}
      >
        {activityIndicator}
        <Text style={styles.addText}>{addButtonText}</Text>
      </Button>
    );
  }

  let cancelButton;
  if (!isLoading) {
    cancelButton = (
      <Button onPress={close} style={styles.cancelButton}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Button>
    );
  } else {
    cancelButton = <View />;
  }

  const threadMemberIDs = React.useMemo(
    () => threadActualMembers(threadInfo.members),
    [threadInfo.members],
  );
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  const excludeUserIDs = React.useMemo(
    () => [
      ...userInfoInputIDs,
      ...threadMemberIDs,
      ...(viewerID ? [viewerID] : []),
    ],
    [userInfoInputIDs, threadMemberIDs, viewerID],
  );

  const otherUserInfos = useSelector(userInfoSelectorForPotentialMembers);
  const { parentThreadID, community } = props.route.params.threadInfo;
  const parentThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );
  const communityThreadInfo = useSelector(state =>
    community ? threadInfoSelector(state)[community] : null,
  );
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);
  const userSearchResults = usePotentialMemberItems({
    text: usernameInputText,
    userInfos: otherUserInfos,
    auxUserInfos,
    excludeUserIDs,
    inputParentThreadInfo: parentThreadInfo,
    inputCommunityThreadInfo: communityThreadInfo,
    threadType: threadInfo.type,
  });

  const onChangeTagInput = React.useCallback(
    (newUserInfoInputArray: $ReadOnlyArray<AccountUserInfo>) => {
      if (!isLoading) {
        setUserInfoInputArray(newUserInfoInputArray);
      }
    },
    [isLoading],
  );

  const onChangeTagInputText = React.useCallback(
    (text: string) => {
      if (!isLoading) {
        setUsernameInputText(text);
      }
    },
    [isLoading],
  );

  const onUserSelect = React.useCallback(
    ({ id }: AccountUserInfo) => {
      if (isLoading) {
        return;
      }
      if (userInfoInputIDs.some(existingUserID => id === existingUserID)) {
        return;
      }
      setUserInfoInputArray(oldUserInfoInputArray => [
        ...oldUserInfoInputArray,
        otherUserInfos[id],
      ]);
      setUsernameInputText('');
    },
    [isLoading, userInfoInputIDs, otherUserInfos],
  );

  const inputProps = React.useMemo(
    () => ({
      ...tagInputProps,
      onSubmitEditing: onPressAdd,
    }),
    [onPressAdd],
  );
  const userSearchResultWithENSNames = useResolvableNames(userSearchResults);
  const userInfoInputArrayWithENSNames = useResolvableNames(userInfoInputArray);
  return (
    <Modal>
      <TagInput
        value={userInfoInputArrayWithENSNames}
        onChange={onChangeTagInput}
        text={usernameInputText}
        onChangeText={onChangeTagInputText}
        labelExtractor={tagDataLabelExtractor}
        defaultInputWidth={160}
        maxHeight={36}
        inputProps={inputProps}
        ref={tagInputRef}
      />
      <UserList
        userInfos={userSearchResultWithENSNames}
        onSelect={onUserSelect}
      />
      <View style={styles.buttons}>
        {cancelButton}
        {addButton}
      </View>
    </Modal>
  );
}

const unboundStyles = {
  activityIndicator: {
    paddingRight: 6,
  },
  addButton: {
    backgroundColor: 'vibrantGreenButton',
    borderRadius: 3,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addText: {
    color: 'white',
    fontSize: 18,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cancelButton: {
    backgroundColor: 'modalButton',
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cancelText: {
    color: 'modalButtonLabel',
    fontSize: 18,
  },
};

const MemoizedAddUsersModal: React.ComponentType<Props> =
  React.memo(AddUsersModal);

export default MemoizedAddUsersModal;
