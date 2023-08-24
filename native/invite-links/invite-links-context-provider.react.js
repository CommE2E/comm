// @flow

import { useNavigation } from '@react-navigation/native';
import * as Application from 'expo-application';
import * as React from 'react';
import { Linking, Platform } from 'react-native';

import {
  verifyInviteLink,
  verifyInviteLinkActionTypes,
} from 'lib/actions/link-actions.js';
import { inviteLinkUrlPrefix } from 'lib/facts/links.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import type { SetState } from 'lib/types/hook-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import { InviteLinkModalRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useOnFirstLaunchEffect } from '../utils/hooks.js';

type InviteLinksContextType = {
  +setCurrentLinkUrl: SetState<?string>,
};

const defaultContext = {
  setCurrentLinkUrl: () => {},
};

const InviteLinksContext: React.Context<InviteLinksContextType> =
  React.createContext<InviteLinksContextType>(defaultContext);

type Props = {
  +children: React.Node,
};
function InviteLinksContextProvider(props: Props): React.Node {
  const { children } = props;
  const [currentLink, setCurrentLink] = React.useState(null);

  React.useEffect(() => {
    // This listener listens for an event where a user clicked a link when the
    // app was running
    const subscription = Linking.addEventListener('url', ({ url }) =>
      setCurrentLink(url),
    );
    // We're also checking if the app was opened by using an invite link.
    // In that case the listener won't be called and we're instead checking
    // if the initial URL is set.
    (async () => {
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
    const linkSecret = parseInstallReferrer(installReferrer);
    if (linkSecret) {
      setCurrentLink(linkSecret);
    }
  }, []);
  useOnFirstLaunchEffect('ANDROID_REFERRER', checkInstallReferrer);

  const loggedIn = useSelector(isLoggedIn);
  const dispatchActionPromise = useDispatchActionPromise();
  const validateLink = useServerCall(verifyInviteLink);
  const navigation = useNavigation();
  const isCurrentLinkInviteLink = React.useMemo(
    () => currentLink?.startsWith(inviteLinkUrlPrefix),
    [currentLink],
  );
  React.useEffect(() => {
    (async () => {
      if (!loggedIn || !currentLink || !isCurrentLinkInviteLink) {
        return;
      }
      // We're setting this to null so that we ensure that each link click
      // results in at most one validation and navigation.
      setCurrentLink(null);

      const secret = parseSecret(currentLink);
      if (!secret) {
        return;
      }

      const validateLinkPromise = validateLink({ secret });
      dispatchActionPromise(verifyInviteLinkActionTypes, validateLinkPromise);
      const result = await validateLinkPromise;
      if (result.status === 'already_joined') {
        return;
      }

      navigation.navigate<'InviteLinkModal'>({
        name: InviteLinkModalRouteName,
        params: {
          invitationDetails: result,
          secret,
        },
      });
    })();
  }, [
    currentLink,
    dispatchActionPromise,
    loggedIn,
    isCurrentLinkInviteLink,
    navigation,
    validateLink,
  ]);

  const contextValue = React.useMemo(
    () => ({
      setCurrentLinkUrl: setCurrentLink,
    }),
    [],
  );

  return (
    <InviteLinksContext.Provider value={contextValue}>
      {children}
    </InviteLinksContext.Provider>
  );
}

const urlRegex = /invite\/(\S+)$/;
function parseSecret(url: string) {
  const match = urlRegex.exec(url);
  return match?.[1];
}

const referrerRegex = /utm_source=(invite\/(\S+))$/;
function parseInstallReferrer(referrer: string) {
  const match = referrerRegex.exec(referrer);
  return match?.[1];
}

export { InviteLinksContext, InviteLinksContextProvider };
