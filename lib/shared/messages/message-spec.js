// @flow

export type MessageSpec<Data> = {|
  +messageContent?: (data: Data) => string | null,
|};
