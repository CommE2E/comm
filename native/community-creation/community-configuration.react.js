// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { CommunityCreationNavigationProp } from './community-creation-navigator.react.js';
import RegistrationContainer from '../account/registration/registration-container.react.js';
import RegistrationContentContainer from '../account/registration/registration-content-container.react.js';
import {
  ThreadSettingsCategoryFooter,
  ThreadSettingsCategoryHeader,
} from '../chat/settings/thread-settings-category.react.js';
import CommIcon from '../components/comm-icon.react.js';
import Pill from '../components/pill.react.js';
import TextInput from '../components/text-input.react.js';
import { type NavigationRoute } from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';

type Props = {
  +navigation: CommunityCreationNavigationProp<'CommunityConfiguration'>,
  +route: NavigationRoute<'CommunityConfiguration'>,
};
// eslint-disable-next-line no-unused-vars
function CommunityConfiguration(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const cloudIcon = (
    <CommIcon
      name="cloud-filled"
      size={12}
      color={colors.panelForegroundLabel}
    />
  );

  const [pendingCommunityName, setPendingCommunityName] = React.useState('');

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
            onChangeText={setPendingCommunityName}
            editable={true}
          />
        </View>
        <ThreadSettingsCategoryFooter type="full" />
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
};

export default CommunityConfiguration;
