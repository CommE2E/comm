// flow-typed signature: 39f28f3c9faafcadb70d2bbe7f61d07e
// flow-typed version: <<STUB>>/@commapp/vodozemac_v0.1.0/flow_v0.269.1

declare module '@commapp/vodozemac' {
  declare export default function init(opts?: Object): Promise<void>;
  declare export function initSync(options: { module: Buffer | Uint8Array }): void;

  declare export class Account {
    constructor(): Account;
    free(): void;

    +ed25519_key: string;
    +curve25519_key: string;
    sign(message: string): string;

    one_time_keys(): Map<string, string>;
    mark_keys_as_published(): void;
    max_number_of_one_time_keys(): number;
    generate_one_time_keys(count: number): void;

    generate_prekey(): void;
    prekey(): ?string;
    unpublished_prekey(): ?string;
    prekey_signature(): ?string;
    forget_old_prekey(): void;

    mark_prekey_as_published(): boolean;
    last_prekey_publish_time(): bigint;

    pickle(pickle_key: Uint8Array): string;
    static from_pickle(pickle: string, pickle_key: Uint8Array): Account;
    static from_libolm_pickle(pickle: string, pickle_key: Uint8Array): Account;

    create_outbound_session(
      identity_key: string,
      signing_key: string,
      one_time_key: ?string,
      pre_key: string,
      pre_key_signature: string,
      olm_compatibility_mode: boolean,
    ): Session;

    create_inbound_session(
      identity_key: string,
      message: OlmMessage,
    ): InboundCreationResult;
  }

  declare export class Session {
    free(): void;

    pickle(pickle_key: Uint8Array): string;
    static from_pickle(pickle: string, pickle_key: Uint8Array): Session;
    static from_libolm_pickle(pickle: string, pickle_key: Uint8Array): Session;

    +session_id: string;
    has_received_message(): boolean;
    is_sender_chain_empty(): boolean;
    session_matches(message: OlmMessage): boolean;

    encrypt(plaintext: string): OlmMessage;
    decrypt(message: OlmMessage): string;
  }

  declare export class OlmMessage {
    constructor(message_type: number, ciphertext: string): OlmMessage;
    free(): void;

    +ciphertext: string;
    +message_type: 0 | 1, // 0: PreKey, 1: Message
  }

  declare export class InboundCreationResult {
    free(): void;

    +plaintext: string;
    into_session(): Session;
  }

  declare export class Utility {
    constructor(): void;
    free(): void;

    sha256(input: string | Uint8Array): string;
    ed25519_verify(
      key: string,
      message: string | Uint8Array,
      signature: string,
    ): void;
  }
}
