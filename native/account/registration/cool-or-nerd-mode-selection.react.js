// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import AuthButtonContainer from './registration-button-container.react.js';
import AuthContainer from './registration-container.react.js';
import AuthContentContainer from './registration-content-container.react.js';
import { RegistrationContext } from './registration-context.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import {
  RegistrationTile,
  RegistrationTileHeader,
} from './registration-tile.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import PrimaryButton from '../../components/primary-button.react.js';
import {
  type NavigationRoute,
  KeyserverSelectionRouteName,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +navigation: RegistrationNavigationProp<'CoolOrNerdModeSelection'>,
  +route: NavigationRoute<'CoolOrNerdModeSelection'>,
};
function CoolOrNerdModeSelection(props: Props): React.Node {
  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { cachedSelections, setCachedSelections } = registrationContext;

  const [currentSelection, setCurrentSelection] =
    React.useState<?CoolOrNerdMode>(cachedSelections.coolOrNerdMode);

  const selectCool = React.useCallback(() => {
    setCurrentSelection('cool');
    setCachedSelections(oldUserSelections => ({
      ...oldUserSelections,
      coolOrNerdMode: 'cool',
    }));
  }, [setCachedSelections]);
  const selectNerd = React.useCallback(() => {
    setCurrentSelection('nerd');
    setCachedSelections(oldUserSelections => ({
      ...oldUserSelections,
      coolOrNerdMode: 'nerd',
    }));
  }, [setCachedSelections]);

  const { navigate } = props.navigation;
  const onSubmit = React.useCallback(() => {
    invariant(
      currentSelection,
      'Button should be disabled if currentSelection is not set',
    );
    navigate<'KeyserverSelection'>({
      name: KeyserverSelectionRouteName,
      params: { userSelections: { coolOrNerdMode: currentSelection } },
    });
  }, [navigate, currentSelection]);

  const buttonState = currentSelection ? 'enabled' : 'disabled';
  const styles = useStyles(unboundStyles);
  return (
    <AuthContainer>
      <AuthContentContainer>
        <Text style={styles.header}>To begin, choose your fighter</Text>
        <Text style={styles.body}>
          Do you want Comm to choose reasonable defaults for you, or do you want
          to see all the options and make the decisions yourself?
        </Text>
        <Text style={styles.body}>
          This setting will affect behavior throughout the app, but you can
          change it later in your settings.
        </Text>
        <RegistrationTile
          selected={currentSelection === 'nerd'}
          onSelect={selectNerd}
        >
          <RegistrationTileHeader>
            <Text style={styles.emojiIcon}>🤓</Text>
            <Text style={styles.tileTitleText}>Nerd mode</Text>
          </RegistrationTileHeader>
          <Text style={styles.tileBody}>
            We present more options and talk through their security and privacy
            implications in detail.
          </Text>
        </RegistrationTile>
        <RegistrationTile
          selected={currentSelection === 'cool'}
          onSelect={selectCool}
        >
          <RegistrationTileHeader>
            <Text style={styles.emojiIcon}>😎</Text>
            <Text style={styles.tileTitleText}>Cool mode</Text>
          </RegistrationTileHeader>
          <Text style={styles.tileBody}>
            We select reasonable defaults for you.
          </Text>
        </RegistrationTile>
      </AuthContentContainer>
      <AuthButtonContainer>
        <PrimaryButton onPress={onSubmit} label="Next" variant={buttonState} />
      </AuthButtonContainer>
    </AuthContainer>
  );
}

const unboundStyles = {
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  body: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
  tileTitleText: {
    flex: 1,
    fontSize: 18,
    color: 'panelForegroundLabel',
  },
  tileBody: {
    fontFamily: 'Arial',
    fontSize: 13,
    color: 'panelForegroundSecondaryLabel',
  },
  emojiIcon: {
    fontSize: 32,
    bottom: 1,
    marginRight: 5,
    color: 'black',
  },
};

export default CoolOrNerdModeSelection;
