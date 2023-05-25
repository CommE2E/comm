// @flow

import * as React from 'react';

import CommunityCreationKeyserverLabel from './community-creation-keyserver-label.react.js';
import type { CommunityCreationNavigationProp } from './community-creation-navigator.react.js';
import RegistrationContainer from '../account/registration/registration-container.react.js';
import RegistrationContentContainer from '../account/registration/registration-content-container.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +navigation: CommunityCreationNavigationProp<'CommunityCreationMembers'>,
  +route: NavigationRoute<'CommunityCreationMembers'>,
};

// eslint-disable-next-line no-unused-vars
function CommunityCreationMembers(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  return (
    <RegistrationContainer>
      <RegistrationContentContainer style={styles.containerPaddingOverride}>
        <CommunityCreationKeyserverLabel />
      </RegistrationContentContainer>
    </RegistrationContainer>
  );
}

const unboundStyles = {
  containerPaddingOverride: {
    padding: 0,
  },
};

export default CommunityCreationMembers;
