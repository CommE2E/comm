// @flow

// Sometimes the connection can just go "away", without the client knowing it.
// To detect this happening, the client hits the server with a "ping" at
// interval specified below when there hasn't been any other communication.
export const pingFrequency = 3000; // in milliseconds

// Time for request to get response after which we consider our connection
// questionable. We won't close and reopen the socket yet, but we will visually
// indicate to the user that their connection doesn't seem to be working.
export const clientRequestVisualTimeout = 5000; // in milliseconds

// Time for request to get response after which we assume our socket
// is dead. It's possible this happened because of some weird shit on
// the server side, so we try to close and reopen the socket in the
// hopes that it will fix the problem. Of course, this is rather
// unlikely, as the connectivity issue is likely on the client side.
export const clientRequestSocketTimeout = 10000; // in milliseconds

// Time after which CallSingleKeyserverEndpoint will timeout a request. When
// using sockets this is preempted by the above timeout, so it really only
// applies for HTTP requests.
export const callSingleKeyserverEndpointTimeout = 10000; // in milliseconds

// The server expects to get a request at least every three
// seconds from the client. If server doesn't get a request
// after time window specified below, it will close connection
export const serverRequestSocketTimeout = 120000; // in milliseconds

// Time server allows itself to respond to client message. If it
// takes it longer to respond, it will timeout and send an error
// response. This is better than letting the request timeout on the
// client, since the client will assume network issues and close the socket.
export const serverResponseTimeout = 10000; // in milliseconds

// This controls how long the client waits before trying to reconnect a
// disconnected keyserver socket.
export const clientKeyserverSocketReconnectDelay = 2000;

// Time after which the client consider the Tunnelbroker connection
// as unhealthy and chooses to close the socket.
export const tunnelbrokerHeartbeatTimeout = 9000; // in milliseconds

// Client-side timeout duration for certain Tunnelbroker WebSocket requests.
export const tunnelbrokerRequestTimeout = 10000; // in milliseconds

// This controls how long the client waits before trying to reconnect a
// disconnected Tunnelbroker socket.
export const clientTunnelbrokerSocketReconnectDelay = 3000;

// Time after which the client consider the Identity Search connection
// as unhealthy and chooses to close the socket.
export const identitySearchHeartbeatTimeout = 9000; // in milliseconds

// This timeout is used for all the requests that perform expensive operations
// related to permissions and auth, e.g. change role, etc.
export const permissionsAndAuthRelatedRequestTimeout = 60000;

// Client-side timeout duration for certain identity service RPCs.
export const callIdentityServiceTimeout = 5000;

export const logoutTimeout = 500;
