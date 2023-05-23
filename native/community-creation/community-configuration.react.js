// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { CommunityCreationNavigationProp } from './community-creation-navigator.react.js';
import RegistrationContainer from '../account/registration/registration-container.react.js';
import RegistrationContentContainer from '../account/registration/registration-content-container.react.js';
import CommIcon from '../components/comm-icon.react.js';
import Pill from '../components/pill.react.js';
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

  const containerPaddingOverride = React.useMemo(() => ({ padding: 0 }), []);
  return (
    <RegistrationContainer>
      <RegistrationContentContainer style={containerPaddingOverride}>
        <View style={styles.keyserverRowContainer}>
          <Text style={styles.withinText}>within</Text>
          <Pill
            label="ashoat"
            backgroundColor={colors.codeBackground}
            icon={cloudIcon}
          />
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
};

export default CommunityConfiguration;
