// @flow

function createOpenSocketFunction(baseURL: string) {
  const [ protocol, address ] = baseURL.split("://");
  const endpoint = `ws://${address}/ws`;
  return () => {
    const socket = new WebSocket(endpoint);
    socket.addEventListener('message', event => {
      console.log(event);
    });
    return socket;
  };

}

export {
  createOpenSocketFunction,
};
