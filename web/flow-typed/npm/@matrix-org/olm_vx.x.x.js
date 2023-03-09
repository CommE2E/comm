// flow-typed signature: 085f002da86534cfd8cee47ffa99dd67
// flow-typed version: <<STUB>>/@matrix-org/olm_v3.2.4/flow_v0.182.0

declare module '@matrix-org/olm' {
  
  declare export class Account {
    constructor(): this;
    free(): void;
    create(): void;
    identity_keys(): string;
    sign(message: string | Uint8Array): string;
    one_time_keys(): string;
    mark_keys_as_published(): void;
    max_number_of_one_time_keys(): number;
    generate_one_time_keys(number_of_keys: number): void;
    remove_one_time_keys(session: Session): void;
    generate_fallback_key(): void;
    fallback_key(): string;
    pickle(key: string | Uint8Array): string;
    unpickle(key: string | Uint8Array, pickle: string): void;
  }

  declare export class Session {
    constructor(): this;
    free(): void;
    pickle(key: string | Uint8Array): string;
    unpickle(key: string | Uint8Array, pickle: string): void;
    create_outbound(
        account: Account, their_identity_key: string, their_one_time_key: string,
    ): void;
    create_inbound(account: Account, one_time_key_message: string): void;
    create_inbound_from(
        account: Account, identity_key: string, one_time_key_message: string,
    ): void;
    session_id(): string;
    has_received_message(): boolean;
    matches_inbound(one_time_key_message: string): boolean;
    matches_inbound_from(identity_key: string, one_time_key_message: string): boolean;
    encrypt(plaintext: string): Object;
    decrypt(message_type: number, message: string): string;
    describe(): string;
  }

  declare class Utility {
    constructor(): this;
    free(): void;
    sha256(input: string | Uint8Array): string;
    ed25519_verify(key: string, message: string | Uint8Array, signature: string): void;
  }

  declare class InboundGroupSession {
    constructor(): this;
    free(): void;
    pickle(key: string | Uint8Array): string;
    unpickle(key: string | Uint8Array, pickle: string): void;
    create(session_key: string): string;
    import_session(session_key: string): string;
    decrypt(message: string): Object;
    session_id(): string;
    first_known_index(): number;
    export_session(message_index: number): string;
  }

  declare class OutboundGroupSession {
    constructor(): this;
    free(): void;
    pickle(key: string | Uint8Array): string;
    unpickle(key: string | Uint8Array, pickle: string): void;
    create(): void;
    encrypt(plaintext: string): string;
    session_id(): string;
    session_key(): string;
    message_index(): number;
  }

  declare class PkEncryption {
    constructor(): this;
    free(): void;
    set_recipient_key(key: string): void;
    encrypt(plaintext: string): Object;
  }

  declare class PkDecryption {
    constructor(): this;
    free(): void;
    init_with_private_key(key: Uint8Array): string;
    generate_key(): string;
    get_private_key(): Uint8Array;
    pickle(key: string | Uint8Array): string;
    unpickle(key: string | Uint8Array, pickle: string): string;
    decrypt(ephemeral_key: string, mac: string, ciphertext: string): string;
  }

  declare class PkSigning {
    constructor(): this;
    free(): void;
    init_with_seed(seed: Uint8Array): string;
    generate_seed(): Uint8Array;
    sign(message: string): string;
  }

  declare class SAS {
    constructor(): this;
    free(): void;
    get_pubkey(): string;
    set_their_key(their_key: string): void;
    generate_bytes(info: string, length: number): Uint8Array;
    calculate_mac(input: string, info: string): string;
    calculate_mac_long_kdf(input: string, info: string): string;
  }

  declare export function init(opts?: Object): Promise<void>;

  declare export function get_library_version(): [number, number, number];

  declare export var PRIVATE_KEY_LENGTH: number;

  declare export default {
    init: typeof init,
    get_library_version: typeof get_library_version,
    PRIVATE_KEY_LENGTH: typeof PRIVATE_KEY_LENGTH,
    Account: typeof Account,
  };
}
