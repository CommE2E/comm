// @flow

import * as React from 'react';

type Props = {
  title: string,
  ...
};
export default function ThreadsTab(props: Props) {
  return <div title={props.title} />;
}
