// flow-typed signature: 4ffffaa246e31defe6bd7054e7869482
// flow-typed version: <<STUB>>/stoppable_v1.1.0/flow_v0.202.1

declare module 'stoppable' {
  declare module.exports: {
    <T: http$Server | ?https$Server>(server: T, grace?: number): T & {
      +stop: (callback?: (error: ?Error, gracefully: boolean) => void) => void,
    }
  }
}
