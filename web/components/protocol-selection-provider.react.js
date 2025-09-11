// @flow

import * as React from 'react';

import {
  ProtocolSelectionContext,
  type ProtocolSelectionContextType,
} from 'lib/contexts/protocol-selection-context.js';
import { useUsersSupportingProtocols } from 'lib/hooks/user-identities-hooks.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec.js';
import type { AccountUserInfo } from 'lib/types/user-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { updateNavInfoActionType } from '../redux/action-types.js';

type ProtocolSelectionProviderProps = {
  +children: React.Node,
  +isSearching?: boolean,
};

function ProtocolSelectionProvider(
  props: ProtocolSelectionProviderProps,
): React.Node {
  const { children, isSearching: isSearchingProp } = props;

  const [selectedProtocol, setSelectedProtocol] =
    React.useState<?ProtocolName>(null);
  const [userInfoInputArray, setUserInfoInputArray] = React.useState<
    $ReadOnlyArray<AccountUserInfo>,
  >([]);
  const [isSearching, setIsSearching] = React.useState<boolean>(
    isSearchingProp ?? false,
  );
  const [isThreadPending, setIsThreadPending] = React.useState<boolean>(false);

  const distpatch = useDispatch();

  React.useEffect(() => {
    if (isSearchingProp !== undefined) {
      setIsSearching(isSearchingProp);
    }
  }, [isSearchingProp]);

  React.useEffect(() => {
    if (!isSearching) {
      setSelectedProtocol(false);
      setUserInfoInputArray([]);
    }
  }, [isSearching, selectedProtocol]);

  React.useEffect(() => {
    console.log('dispathing');
    distpatch({
      type: updateNavInfoActionType,
      payload: {
        selectedProtocol,
      },
    });
    // if (!selectedProtocol) {
    //   distpatch({
    //     type: updateNavInfoActionType,
    //     payload: {
    //       selectedProtocol: null,
    //     },
    //   });
    // } else if (selectedProtocol === 'Comm DM') {
    //   distpatch({
    //     type: updateNavInfoActionType,
    //     payload: {
    //       selectedProtocol: 'dm',
    //     },
    //   });
    // } else if (selectedProtocol === 'Farcaster DC') {
    //   distpatch({
    //     type: updateNavInfoActionType,
    //     payload: {
    //       selectedProtocol: 'dc',
    //     },
    //   });
    // } else if (selectedProtocol === 'Keyserver') {
    //   distpatch({
    //     type: updateNavInfoActionType,
    //     payload: {
    //       selectedProtocol: 'keyserver',
    //     },
    //   });
    // }
  }, [distpatch, selectedProtocol]);

  const { allUsersSupportThickThreads, allUsersSupportFarcasterThreads } =
    useUsersSupportingProtocols(userInfoInputArray);

  const availableProtocols = React.useMemo(() => {
    const protocols = [];

    if (userInfoInputArray.length === 0 || allUsersSupportFarcasterThreads) {
      protocols.push('Farcaster DC');
    }
    if (userInfoInputArray.length === 0 || allUsersSupportThickThreads) {
      protocols.push('Comm DM');
    }

    return protocols.filter(protocol => protocol !== selectedProtocol);
  }, [
    allUsersSupportFarcasterThreads,
    allUsersSupportThickThreads,
    selectedProtocol,
    userInfoInputArray.length,
  ]);

  React.useEffect(() => {
    if (userInfoInputArray.length === 0 || !isThreadPending) {
      return;
    }
    if (allUsersSupportFarcasterThreads && !allUsersSupportThickThreads) {
      setSelectedProtocol('Farcaster DC');
    } else if (
      !allUsersSupportFarcasterThreads &&
      allUsersSupportThickThreads
    ) {
      setSelectedProtocol('Comm DM');
    }
  }, [
    allUsersSupportFarcasterThreads,
    allUsersSupportThickThreads,
    isThreadPending,
    selectedProtocol,
    userInfoInputArray.length,
  ]);

  const contextValue = React.useMemo(
    () => ({
      selectedProtocol,
      setSelectedProtocol,
      availableProtocols,
      setUserInfoInput: setUserInfoInputArray,
      setIsSearching,
      setIsThreadPending,
    }),
    [availableProtocols, selectedProtocol],
  );

  return (
    <ProtocolSelectionContext.Provider value={contextValue}>
      {children}
    </ProtocolSelectionContext.Provider>
  );
}

export { ProtocolSelectionProvider };
