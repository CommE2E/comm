// flow-typed signature: 87ecff52383db025a798afd90d2a1d56
// flow-typed version: c6154227d1/isomorphic-fetch_v2.x.x/flow_>=v0.25.x <=v0.103.x

declare module "isomorphic-fetch" {
  declare module.exports: (
    input: string | Request | URL,
    init?: RequestOptions
  ) => Promise<Response>;
}
