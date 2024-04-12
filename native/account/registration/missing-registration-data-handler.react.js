// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';

import { RegistrationContext } from './registration-context.js';
import { commCoreModule } from '../../native-modules.js';
import { MissingSIWEBackupSecretsRouteName } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';

function MissingRegistrationDataHandler(): React.Node {
  const loggedIn = useSelector(isLoggedIn);
  const navigation = useNavigation();
  const currentUserInfo = useSelector(state => state.currentUserInfo);

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { siweBackupSecrets } = registrationContext;

  React.useEffect(() => {
    void (async () => {
      if (
        !currentUserInfo ||
        accountHasPassword(currentUserInfo) ||
        !loggedIn ||
        siweBackupSecrets
      ) {
        return;
      }

      const nativeSIWEBackupSecrets =
        await commCoreModule.getSIWEBackupSecrets();

      if (!nativeSIWEBackupSecrets) {
        navigation.navigate<'MissingSIWEBackupSecrets'>({
          name: MissingSIWEBackupSecretsRouteName,
        });
      }
    })();
  }, [currentUserInfo, loggedIn, siweBackupSecrets, navigation]);

  return null;
}

export { MissingRegistrationDataHandler };
