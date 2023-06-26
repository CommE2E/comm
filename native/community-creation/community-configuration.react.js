// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import { newThread, newThreadActionTypes } from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { NewThreadResult } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import CommunityCreationKeyserverLabel from './community-creation-keyserver-label.react.js';
import type { CommunityCreationNavigationProp } from './community-creation-navigator.react.js';
import RegistrationButtonContainer from '../account/registration/registration-button-container.react.js';
import RegistrationButton from '../account/registration/registration-button.react.js';
import RegistrationContainer from '../account/registration/registration-container.react.js';
import RegistrationContentContainer from '../account/registration/registration-content-container.react.js';
import {
  ThreadSettingsCategoryFooter,
  ThreadSettingsCategoryHeader,
} from '../chat/settings/thread-settings-category.react.js';
import EnumSettingsOption from '../components/enum-settings-option.react.js';
import TextInput from '../components/text-input.react.js';
import { useCalendarQuery } from '../navigation/nav-selectors.js';
import {
  CommunityCreationMembersRouteName,
  type NavigationRoute,
} from '../navigation/route-names.js';
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

  const { navigate } = props.navigation;

  const dispatchActionPromise = useDispatchActionPromise();

  const callNewThread = useServerCall(newThread);
  const calendarQueryFunc = useCalendarQuery();

  const createNewCommunityLoadingStatus: LoadingStatus = useSelector(
    createNewCommunityLoadingStatusSelector,
  );

  const [pendingCommunityName, setPendingCommunityName] = React.useState('');
  const [announcementSetting, setAnnouncementSetting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<?string>();

  const onChangePendingCommunityName = React.useCallback(newValue => {
    setErrorMessage();
    setPendingCommunityName(newValue);
  }, []);

  const callCreateNewCommunity = React.useCallback(async () => {
    const calendarQuery = calendarQueryFunc();
    try {
      const newThreadResult: NewThreadResult = await callNewThread({
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
    callNewThread,
    pendingCommunityName,
  ]);

  const createNewCommunity = React.useCallback(async () => {
    setErrorMessage();
    const newThreadResultPromise = callCreateNewCommunity();
    dispatchActionPromise(newThreadActionTypes, newThreadResultPromise);
    const newThreadResult = await newThreadResultPromise;

    navigate<'CommunityCreationMembers'>({
      name: CommunityCreationMembersRouteName,
      params: {
        announcement: announcementSetting,
        threadID: newThreadResult.newThreadID,
      },
    });
  }, [
    announcementSetting,
    callCreateNewCommunity,
    dispatchActionPromise,
    navigate,
  ]);

  const onCheckBoxPress = React.useCallback(() => {
    setErrorMessage();
    setAnnouncementSetting(!announcementSetting);
  }, [announcementSetting]);

  const enumSettingsOptionDescription =
    'Make it so only admins can post to ' +
    'the root channel of the community.';

  return (
    <RegistrationContainer>
      <RegistrationContentContainer style={styles.containerPaddingOverride}>
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
        <EnumSettingsOption
          icon="megaphone"
          name="Announcement root"
          description={enumSettingsOptionDescription}
          enumValue={announcementSetting}
          onEnumValuePress={onCheckBoxPress}
        />
        <ThreadSettingsCategoryFooter type="full" />
        <RegistrationButtonContainer>
          <RegistrationButton
            onPress={createNewCommunity}
            label="Create Community"
            variant={
              createNewCommunityLoadingStatus === 'loading'
                ? 'loading'
                : 'enabled'
            }
          />
        </RegistrationButtonContainer>
        <View style={styles.errorMessageContainer}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      </RegistrationContentContainer>
    </RegistrationContainer>
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
  errorMessageContainer: {
    alignItems: 'center',
  },
  errorMessageText: {
    color: 'redText',
  },
};

export default CommunityConfiguration;
