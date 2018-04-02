// @flow

import * as React from 'react'
import ReactHTML from 'react-html-email';

const { Email, Box, Item } = ReactHTML;

const css = `
@media only screen and (max-device-width: 480px) {
  font-size: 20px !important;
}`.trim();

type Props = {|
  title: string,
  children: React.Node,
|};
function Template(props: Props) {
  return (
    <Email title={props.title} headCSS={css}>
      <Box>
        <Item>
          {props.children}
        </Item>
      </Box>
    </Email>
  );
}

export default Template;
