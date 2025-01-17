// @flow

import type {
  UpdateUserAvatarRequest,
  ClientAvatar,
} from 'lib/types/avatar-types.js';
import type { NativeMediaSelection } from 'lib/types/media-types.js';
import type { SIWEResult, SignedMessage } from 'lib/types/siwe-types.js';

export type CoolOrNerdMode = 'cool' | 'nerd';

export type EthereumAccountSelection = {
  +accountType: 'ethereum',
  ...SIWEResult,
  +avatarURI: ?string,
};

export type UsernameAccountSelection = {
  +accountType: 'username',
  +username: string,
  +password: string,
};

export type AccountSelection =
  | EthereumAccountSelection
  | UsernameAccountSelection;

export type AvatarData =
  | {
      +needsUpload: true,
      +mediaSelection: NativeMediaSelection,
      +clientAvatar: ClientAvatar,
    }
  | {
      +needsUpload: false,
      +updateUserAvatarRequest: UpdateUserAvatarRequest,
      +clientAvatar: ClientAvatar,
    };

export type RegistrationServerCallInput = {
  +coolOrNerdMode?: ?CoolOrNerdMode,
  +keyserverURL?: ?string,
  +farcasterID: ?string,
  +accountSelection: AccountSelection,
  +avatarData: ?AvatarData,
  +siweBackupSecrets?: ?SignedMessage,
  +farcasterAvatarURL: ?string,
  +clearCachedSelections: () => void,
  +onNonceExpired: () => mixed,
  +onAlertAcknowledged?: () => mixed,
};

export type CachedUserSelections = {
  +coolOrNerdMode?: CoolOrNerdMode,
  +keyserverURL?: string,
  +username?: string,
  +password?: string,
  +avatarData?: ?AvatarData,
  +ethereumAccount?: ?EthereumAccountSelection,
  +farcasterID?: string,
  +siweBackupSecrets?: ?SignedMessage,
  +farcasterAvatarURL?: ?string,
};

export const ensAvatarSelection: AvatarData = {
  needsUpload: false,
  updateUserAvatarRequest: { type: 'ens' },
  clientAvatar: { type: 'ens' },
};

export const farcasterAvatarSelection: AvatarData = {
  needsUpload: false,
  updateUserAvatarRequest: { type: 'farcaster' },
  clientAvatar: { type: 'farcaster' },
};
