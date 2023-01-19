// @flow

// flow-typed signature: e7cb9cb805c20a715f16a8385248ee0b
// flow-typed version: <<STUB>>/hazel-server_v5.1.1/flow_v0.198.1

declare module 'hazel-server' {
  declare export default function hazel(options: {
    interval?: number,
    repository?: string,
    account?: string,
    pre?: boolean,
    token?: string,
    url?: string,
  }): (Request, Response) => void;
}
