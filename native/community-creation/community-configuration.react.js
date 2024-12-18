// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import {
  useNewThinThread,
  newThreadActionTypes,
} from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { NewThreadResult } from 'lib/types/thread-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import CommunityCreationKeyserverLabel from './community-creation-keyserver-label.react.js';
import type { CommunityCreationNavigationProp } from './community-creation-navigator.react.js';
import AuthButtonContainer from '../account/registration/registration-button-container.react.js';
import AuthContainer from '../account/registration/registration-container.react.js';
import AuthContentContainer from '../account/registration/registration-content-container.react.js';
import { useNavigateToThread } from '../chat/message-list-types.js';
import {
  ThreadSettingsCategoryFooter,
  ThreadSettingsCategoryHeader,
} from '../chat/settings/thread-settings-category.react.js';
import EnumSettingsOption from '../components/enum-settings-option.react.js';
import PrimaryButton from '../components/primary-button.react.js';
import TextInput from '../components/text-input.react.js';
import { useCalendarQuery } from '../navigation/nav-selectors.js';
import { type NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, useStyles } from '../themes/colors.js';

type Props = {
  +navigation: CommunityCreationNavigationProp<'CommunityConfiguration'>,
  +route: NavigationRoute<'CommunityConfiguration'>,
};

const createNewCommunityLoadingStatusSelector =
  createLoadingStatusSelector(newThreadActionTypes);

// eslint-disable-next-line no-unused-vars
function CommunityConfiguration(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const dispatchActionPromise = useDispatchActionPromise();

  const callNewThinThread = useNewThinThread();
  const calendarQueryFunc = useCalendarQuery();

  const createNewCommunityLoadingStatus: LoadingStatus = useSelector(
    createNewCommunityLoadingStatusSelector,
  );

  const [pendingCommunityName, setPendingCommunityName] = React.useState('');
  const [announcementSetting, setAnnouncementSetting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<?string>();

  const onChangePendingCommunityName = React.useCallback((newValue: string) => {
    setErrorMessage();
    setPendingCommunityName(newValue);
  }, []);

  const callCreateNewCommunity = React.useCallback(async () => {
    const calendarQuery = calendarQueryFunc();
    try {
      const newThreadResult: NewThreadResult = await callNewThinThread({
        name: pendingCommunityName,
        type: announcementSetting
          ? threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT
          : threadTypes.COMMUNITY_ROOT,
        calendarQuery,
      });
      return newThreadResult;
    } catch (e) {
      setErrorMessage('Community creation failed. Please try again.');
      throw e;
    }
  }, [
    announcementSetting,
    calendarQueryFunc,
    callNewThinThread,
    pendingCommunityName,
  ]);

  const [newCommunityID, setNewCommunityID] = React.useState<?string>(null);

  const createNewCommunity = React.useCallback(async () => {
    setErrorMessage();
    const newThreadResultPromise = callCreateNewCommunity();
    void dispatchActionPromise(newThreadActionTypes, newThreadResultPromise);
    const newThreadResult = await newThreadResultPromise;

    setNewCommunityID(newThreadResult.newThreadID);
  }, [callCreateNewCommunity, dispatchActionPromise]);

  const navigateToThread = useNavigateToThread();
  const threadInfos = useSelector(threadInfoSelector);

  React.useEffect(() => {
    if (!newCommunityID) {
      return;
    }
    const communityThreadInfo = threadInfos[newCommunityID];
    if (communityThreadInfo) {
      navigateToThread({ threadInfo: communityThreadInfo });
    }
  }, [navigateToThread, newCommunityID, threadInfos]);

  const onCheckBoxPress = React.useCallback(() => {
    setErrorMessage();
    setAnnouncementSetting(!announcementSetting);
  }, [announcementSetting]);

  const enumSettingsOptionDescription =
    'Make it so only admins can post to ' +
    'the root channel of the community.';

  return (
    <AuthContainer>
      <AuthContentContainer style={styles.containerPaddingOverride}>
        <CommunityCreationKeyserverLabel />
        <ThreadSettingsCategoryHeader type="full" title="COMMUNITY INFO" />
        <View style={styles.communityNameRow}>
          <Text style={styles.communityNameLabel}>Name</Text>
          <TextInput
            style={styles.communityNamePendingValue}
            placeholder="Community Name"
            placeholderTextColor={colors.panelSecondaryForegroundBorder}
            value={pendingCommunityName}
            onChangeText={onChangePendingCommunityName}
            editable={true}
          />
        </View>
        <ThreadSettingsCategoryFooter type="full" />

        <View style={styles.communityNameNoticeContainer}>
          <Text style={styles.communityNameNoticeText}>
            You may edit your community&rsquo;s image and name later.
          </Text>
        </View>

        <ThreadSettingsCategoryHeader type="full" title="OPTIONAL SETTINGS" />
        <View style={styles.optionalSettingsContainer}>
          <EnumSettingsOption
            icon="megaphone"
            name="Announcement root"
            description={enumSettingsOptionDescription}
            enumValue={announcementSetting}
            onEnumValuePress={onCheckBoxPress}
            type="checkbox"
          />
        </View>
        <ThreadSettingsCategoryFooter type="full" />
        <AuthButtonContainer>
          <PrimaryButton
            onPress={createNewCommunity}
            label="Create community"
            variant={
              createNewCommunityLoadingStatus === 'loading'
                ? 'loading'
                : 'enabled'
            }
          />
        </AuthButtonContainer>
        <View style={styles.errorMessageContainer}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      </AuthContentContainer>
    </AuthContainer>
  );
}

const unboundStyles = {
  containerPaddingOverride: {
    padding: 0,
  },
  communityNameRow: {
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  communityNameLabel: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    width: 96,
  },
  communityNamePendingValue: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontFamily: 'Arial',
    fontSize: 16,
    margin: 0,
    paddingLeft: 4,
    paddingRight: 0,
    paddingVertical: 0,
    borderBottomColor: 'transparent',
  },
  communityNameNoticeContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  communityNameNoticeText: {
    color: 'panelForegroundTertiaryLabel',
  },
  optionalSettingsContainer: {
    backgroundColor: 'panelForeground',
    paddingVertical: 4,
  },
  errorMessageContainer: {
    alignItems: 'center',
  },
  errorMessageText: {
    color: 'redText',
  },
};

export default CommunityConfiguration;
