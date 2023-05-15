// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { Linking } from 'react-native';

import {
  verifyInviteLink,
  verifyInviteLinkActionTypes,
} from 'lib/actions/link-actions.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import { InviteLinkModalRouteName } from './route-names.js';
import { useSelector } from '../redux/redux-utils.js';

function InviteLinkHandler(): null {
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

  const loggedIn = useSelector(isLoggedIn);
  const dispatchActionPromise = useDispatchActionPromise();
  const validateLink = useServerCall(verifyInviteLink);
  const navigation = useNavigation();
  React.useEffect(() => {
    (async () => {
      if (!loggedIn || !currentLink) {
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
  }, [currentLink, dispatchActionPromise, loggedIn, navigation, validateLink]);

  return null;
}

const urlRegex = /invite\/(\S+)$/;
function parseSecret(url: string) {
  const match = urlRegex.exec(url);
  return match?.[1];
}

export default InviteLinkHandler;
