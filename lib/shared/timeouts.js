// @flow

// Sometimes the connection can just go "away", without the client knowing it.
// To detect this happening, the client hits the server with a "ping" every
// three seconds when there hasn't been any other communication.
export const pingFrequency = 3000; // in milliseconds

// If a request doesn't get a response within three seconds, that means our
// connection is questionable. We won't close and reopen the socket yet, but we
// will visually indicate to the user that their connection doesn't seem to be
// working.
export const clientRequestVisualTimeout = 3000; // in milliseconds

// If a request doesn't get a response within five seconds, we assume our socket
// is dead. It's possible this happened because of some weird shit on the server
// side, so we try to close and reopen the socket in the hopes that it will fix
// the problem. Of course, this is rather unlikely, as the connectivity issue is
// likely on the client side.
export const clientRequestSocketTimeout = 5000; // in milliseconds

// FetchJSON will timeout a request after 10 seconds. When using sockets this is
// preempted by the above timeout, so it really only applies for HTTP requests.
export const fetchJSONTimeout = 10000; // in milliseconds

// The server expects to get a request at least every three seconds from the
// client. If it doesn't get a request within a two minute window, it will close
// the connection.
export const serverRequestSocketTimeout = 120000; // in milliseconds

// If the server finds itself taking longer than three seconds to respond to a
// client message, it will timeout and send an error response. This is better
// than letting the request timeout on the client, since the client will assume
// network issues and close the socket.
export const serverResponseTimeout = 3000; // in milliseconds
