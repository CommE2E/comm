// @flow

import * as React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { newThread, newThreadActionTypes } from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { NewThreadResult } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import type { CommunityCreationNavigationProp } from './community-creation-navigator.react.js';
import RegistrationButtonContainer from '../account/registration/registration-button-container.react.js';
import RegistrationButton from '../account/registration/registration-button.react.js';
import RegistrationContainer from '../account/registration/registration-container.react.js';
import RegistrationContentContainer from '../account/registration/registration-content-container.react.js';
import {
  ThreadSettingsCategoryFooter,
  ThreadSettingsCategoryHeader,
} from '../chat/settings/thread-settings-category.react.js';
import CommIcon from '../components/comm-icon.react.js';
import Pill from '../components/pill.react.js';
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

  const callNewThread = useServerCall(newThread);
  const calendarQueryFunc = useCalendarQuery();

  const createNewCommunityLoadingStatus: LoadingStatus = useSelector(
    createNewCommunityLoadingStatusSelector,
  );

  const cloudIcon = (
    <CommIcon
      name="cloud-filled"
      size={12}
      color={colors.panelForegroundLabel}
    />
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
    await newThreadResultPromise;
  }, [callCreateNewCommunity, dispatchActionPromise]);

  const onCheckBoxPress = React.useCallback(() => {
    setErrorMessage();
    setAnnouncementSetting(!announcementSetting);
  }, [announcementSetting]);

  let checkBoxFill;
  if (announcementSetting) {
    checkBoxFill = <View style={styles.enumCheckBoxFill} />;
  }

  return (
    <RegistrationContainer>
      <RegistrationContentContainer style={styles.containerPaddingOverride}>
        <View style={styles.keyserverRowContainer}>
          <Text style={styles.withinText}>within</Text>
          <Pill
            label="ashoat"
            backgroundColor={colors.codeBackground}
            icon={cloudIcon}
          />
        </View>

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
        <View style={styles.enumCell}>
          <View style={styles.enumIcon}>
            <CommIcon name="megaphone" size={24} color={colors.purpleButton} />
          </View>
          <View style={styles.enumInfoContainer}>
            <Text style={styles.enumInfoName}>Announcement root</Text>
            <Text style={styles.enumInfoDescription}>
              Make it so that only admins can post to the root channel of the
              community.
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCheckBoxPress}
            style={styles.enumCheckBoxContainer}
            activeOpacity={0.4}
          >
            <View style={styles.enumCheckBox}>{checkBoxFill}</View>
          </TouchableOpacity>
        </View>
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
  keyserverRowContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'panelForeground',
    height: 48,
    borderColor: 'panelForegroundBorder',
    borderBottomWidth: 1,
  },
  withinText: {
    color: 'panelForegroundLabel',
    fontSize: 14,
    marginRight: 6,
  },
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
  enumCell: {
    flexDirection: 'row',
    height: 96,
    backgroundColor: 'panelForeground',
  },
  enumIcon: {
    padding: 16,
  },
  enumInfoContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-evenly',
    padding: 8,
  },
  enumInfoName: {
    color: 'panelForegroundLabel',
    fontSize: 18,
    lineHeight: 24,
  },
  enumInfoDescription: {
    color: 'panelForegroundSecondaryLabel',
    lineHeight: 18,
  },
  enumCheckBoxContainer: {
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enumCheckBox: {
    height: 32,
    width: 32,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: 'panelSecondaryForegroundBorder',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enumCheckBoxFill: {
    height: 20,
    width: 20,
    borderRadius: 2.1875,
    backgroundColor: 'panelForegroundSecondaryLabel',
  },
  errorMessageContainer: {
    alignItems: 'center',
  },
  errorMessageText: {
    color: 'redText',
  },
};

export default CommunityConfiguration;
