// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';

import { commCoreModule } from '../../../native-modules.js';
import { CreateMissingSIWEBackupMessageRouteName } from '../../../navigation/route-names.js';
import { useSelector } from '../../../redux/redux-utils.js';
import { RegistrationContext } from '../registration-context.js';

function MissingRegistrationDataHandler(): React.Node {
  const loggedIn = useSelector(isLoggedIn);
  const navigation = useNavigation();
  const currentUserInfo = useSelector(state => state.currentUserInfo);

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { cachedSelections } = registrationContext;

  React.useEffect(() => {
    if (
      !loggedIn ||
      accountHasPassword(currentUserInfo) ||
      cachedSelections.siweBackupSecrets
    ) {
      return;
    }

    void (async () => {
      const nativeSIWEBackupSecrets =
        await commCoreModule.getSIWEBackupSecrets();

      if (nativeSIWEBackupSecrets) {
        return;
      }

      navigation.navigate<'CreateMissingSIWEBackupMessage'>({
        name: CreateMissingSIWEBackupMessageRouteName,
      });
    })();
  }, [
    currentUserInfo,
    loggedIn,
    cachedSelections.siweBackupSecrets,
    navigation,
  ]);

  return null;
}

export { MissingRegistrationDataHandler };
