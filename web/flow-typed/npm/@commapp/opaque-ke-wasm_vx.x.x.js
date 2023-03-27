// flow-typed signature: 8ee70b4d84f861b07c5c7ae0ccf6ca25
// flow-typed version: <<STUB>>/@commapp/opaque-ke-wasm_v0.0.3/flow_v0.182.0

declare module '@commapp/opaque-ke-wasm' {

  declare export class Login {
    constructor(): void;
    free(): void;
    start(password: string): Uint8Array;
    finish(response_payload: Uint8Array): Uint8Array;
    +session_key: Uint8Array;
  }

  declare export class Registration {
    constructor(): void;
    free(): void;
    start(password: string): Uint8Array;
    finish(password: string, response_payload: Uint8Array): Uint8Array;
  }

  declare export default function init(
    input: void | string | Request | URL,
  ): Promise<mixed>;

}
