// @flow

import { useNavigation } from '@react-navigation/native';
import * as Application from 'expo-application';
import invariant from 'invariant';
import * as React from 'react';
import { Linking, Platform } from 'react-native';

import {
  useVerifyInviteLink,
  verifyInviteLinkActionTypes,
} from 'lib/actions/link-actions.js';
import { useInvalidCSATLogOut } from 'lib/actions/user-actions.js';
import {
  parseInstallReferrerFromInviteLinkURL,
  parseDataFromDeepLink,
  type ParsedDeepLinkData,
} from 'lib/facts/links.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { getKeyserverOverrideForAnInviteLink } from 'lib/shared/invite-links.js';
import type { KeyserverOverride } from 'lib/shared/invite-links.js';
import type { SetState } from 'lib/types/hook-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import {
  errorMessageIsInvalidCSAT,
  usingCommServicesAccessToken,
} from 'lib/utils/services-utils.js';

import {
  InviteLinkModalRouteName,
  SecondaryDeviceQRCodeScannerRouteName,
} from './route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useOnFirstLaunchEffect } from '../utils/hooks.js';

type DeepLinksContextType = {
  +setCurrentLinkUrl: SetState<?string>,
};

const defaultContext = {
  setCurrentLinkUrl: () => {},
};

const DeepLinksContext: React.Context<DeepLinksContextType> =
  React.createContext<DeepLinksContextType>(defaultContext);

type Props = {
  +children: React.Node,
};
function DeepLinksContextProvider(props: Props): React.Node {
  const { children } = props;
  const [currentLink, setCurrentLink] = React.useState<?string>(null);

  React.useEffect(() => {
    // This listener listens for an event where a user clicked a link when the
    // app was running
    const subscription = Linking.addEventListener('url', ({ url }) =>
      setCurrentLink(url),
    );
    // We're also checking if the app was opened by using a link.
    // In that case the listener won't be called and we're instead checking
    // if the initial URL is set.
    void (async () => {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) {
        setCurrentLink(initialURL);
      }
    })();

    return () => {
      subscription.remove();
    };
  }, []);

  const checkInstallReferrer = React.useCallback(async () => {
    if (Platform.OS !== 'android') {
      return;
    }
    const installReferrer = await Application.getInstallReferrerAsync();
    if (!installReferrer) {
      return;
    }
    const linkSecret = parseInstallReferrerFromInviteLinkURL(installReferrer);
    if (linkSecret) {
      setCurrentLink(linkSecret);
    }
  }, []);
  useOnFirstLaunchEffect('ANDROID_REFERRER', checkInstallReferrer);

  const [keyserverOverride, setKeyserverOverride] =
    React.useState<?KeyserverOverride>(undefined);
  const inviteLinkSecret = React.useRef<?string>(null);

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { getAuthMetadata } = identityContext;

  const invalidTokenLogOut = useInvalidCSATLogOut();
  const loggedIn = useSelector(isLoggedIn);
  const dispatchActionPromise = useDispatchActionPromise();
  const validateLink = useVerifyInviteLink(keyserverOverride);
  const navigation = useNavigation();
  React.useEffect(() => {
    void (async () => {
      if (!loggedIn || !currentLink) {
        return;
      }
      // We're setting this to null so that we ensure that each link click
      // results in at most one validation and navigation.
      setCurrentLink(null);
      setKeyserverOverride(undefined);
      inviteLinkSecret.current = null;

      const parsedData: ParsedDeepLinkData = parseDataFromDeepLink(currentLink);
      if (!parsedData) {
        return;
      }

      if (parsedData.type === 'invite-link') {
        let authMetadata;
        if (usingCommServicesAccessToken) {
          authMetadata = await getAuthMetadata();
        }

        const { secret } = parsedData.data;
        inviteLinkSecret.current = secret;
        try {
          const newKeyserverOverride =
            await getKeyserverOverrideForAnInviteLink(secret, authMetadata);
          setKeyserverOverride(newKeyserverOverride);
        } catch (e) {
          if (errorMessageIsInvalidCSAT(e)) {
            void invalidTokenLogOut();
            return;
          }
          console.log('Error while downloading an invite link blob', e);
          navigation.navigate<'InviteLinkModal'>({
            name: InviteLinkModalRouteName,
            params: {
              invitationDetails: {
                status: 'invalid',
              },
              secret,
            },
          });
        }
      } else if (parsedData.type === 'qr-code') {
        navigation.navigate(SecondaryDeviceQRCodeScannerRouteName);
      }
    })();
  }, [currentLink, getAuthMetadata, loggedIn, navigation, invalidTokenLogOut]);

  React.useEffect(() => {
    const secret = inviteLinkSecret.current;
    if (keyserverOverride === undefined || !secret) {
      return;
    }
    setKeyserverOverride(undefined);

    void (async () => {
      let result;
      try {
        const validateLinkPromise = validateLink({ secret });
        void dispatchActionPromise(
          verifyInviteLinkActionTypes,
          validateLinkPromise,
        );
        result = await validateLinkPromise;
      } catch (e) {
        console.log(e);
        result = {
          status: 'invalid',
        };
      }

      navigation.navigate<'InviteLinkModal'>({
        name: InviteLinkModalRouteName,
        params: {
          invitationDetails: result,
          secret,
          keyserverOverride,
        },
      });
    })();
  }, [dispatchActionPromise, keyserverOverride, navigation, validateLink]);

  const contextValue = React.useMemo(
    () => ({
      setCurrentLinkUrl: setCurrentLink,
    }),
    [],
  );

  return (
    <DeepLinksContext.Provider value={contextValue}>
      {children}
    </DeepLinksContext.Provider>
  );
}

export { DeepLinksContext, DeepLinksContextProvider };
