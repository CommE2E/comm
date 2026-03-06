// @flow

import * as React from 'react';

import {
  useUsersSupportFarcasterDCs,
  useUsersSupportThickThreads,
} from 'lib/hooks/user-identities-hooks.js';
import { getSupportedProtocolsForUser } from 'lib/shared/protocol-selection-utils.js';
import type { ProtocolName } from 'lib/types/protocol-names.js';
import type {
  AccountUserInfo,
  SelectedUserInfo,
} from 'lib/types/user-types.js';

type UseSelectedUserInfosWithSupportedProtocolsResult = {
  +selectedUserInfos: $ReadOnlyArray<SelectedUserInfo>,
  +setUserInfoInput: ($ReadOnlyArray<SelectedUserInfo>) => mixed,
};

const provisionalSupportedProtocols = getSupportedProtocolsForUser({});

function useSelectedUserInfosWithSupportedProtocols(
  rawSelectedUserInfos: $ReadOnlyArray<AccountUserInfo>,
  isChatCreation: boolean,
): UseSelectedUserInfosWithSupportedProtocolsResult {
  const [supportedProtocolsByUserID, setSupportedProtocolsByUserID] =
    React.useState<$ReadOnlyMap<string, $ReadOnlyArray<ProtocolName>>>(
      new Map(),
    );
  const checkUsersThickThreadSupport = useUsersSupportThickThreads();
  const checkUsersFarcasterDCsSupport = useUsersSupportFarcasterDCs();
  const requestIDRef = React.useRef(0);

  const setUserInfoInput = React.useCallback(
    (selectedUserInfos: $ReadOnlyArray<SelectedUserInfo>) => {
      setSupportedProtocolsByUserID(currentSupportedProtocolsByUserID => {
        const nextSupportedProtocolsByUserID = new Map(
          currentSupportedProtocolsByUserID,
        );
        for (const userInfo of selectedUserInfos) {
          nextSupportedProtocolsByUserID.set(
            userInfo.id,
            userInfo.supportedProtocols,
          );
        }
        return nextSupportedProtocolsByUserID;
      });
    },
    [],
  );

  React.useEffect(() => {
    if (!isChatCreation) {
      setSupportedProtocolsByUserID(new Map());
    }
  }, [isChatCreation]);

  React.useEffect(() => {
    requestIDRef.current = requestIDRef.current + 1;
    const currentRequestID = requestIDRef.current;

    if (!isChatCreation) {
      return;
    }

    const usersNeedingFetch = rawSelectedUserInfos.filter(
      userInfo => !supportedProtocolsByUserID.has(userInfo.id),
    );
    if (usersNeedingFetch.length === 0) {
      return;
    }

    void (async () => {
      const userIDs = usersNeedingFetch.map(userInfo => userInfo.id);
      const [usersSupportingThickThreads, usersSupportingFarcasterDCs] =
        await Promise.all([
          checkUsersThickThreadSupport(userIDs),
          checkUsersFarcasterDCsSupport(userIDs),
        ]);

      if (requestIDRef.current !== currentRequestID) {
        return;
      }

      setSupportedProtocolsByUserID(currentSupportedProtocolsByUserID => {
        const nextSupportedProtocolsByUserID = new Map(
          currentSupportedProtocolsByUserID,
        );
        for (const userInfo of usersNeedingFetch) {
          nextSupportedProtocolsByUserID.set(
            userInfo.id,
            getSupportedProtocolsForUser({
              supportsThickThreads: usersSupportingThickThreads.get(
                userInfo.id,
              ),
              supportsFarcasterDCs: usersSupportingFarcasterDCs.get(
                userInfo.id,
              ),
            }),
          );
        }
        return nextSupportedProtocolsByUserID;
      });
    })();
  }, [
    checkUsersFarcasterDCsSupport,
    checkUsersThickThreadSupport,
    isChatCreation,
    rawSelectedUserInfos,
    supportedProtocolsByUserID,
  ]);

  const selectedUserInfos = React.useMemo(() => {
    return rawSelectedUserInfos.map(userInfo => ({
      ...userInfo,
      supportedProtocols:
        supportedProtocolsByUserID.get(userInfo.id) ??
        provisionalSupportedProtocols,
    }));
  }, [rawSelectedUserInfos, supportedProtocolsByUserID]);

  return React.useMemo(
    () => ({
      selectedUserInfos,
      setUserInfoInput,
    }),
    [selectedUserInfos, setUserInfoInput],
  );
}

export { useSelectedUserInfosWithSupportedProtocols };
