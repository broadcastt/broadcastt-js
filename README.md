# Broadcastt

Realtime web applications are the future. [Broadcastt](https://broadcastt.xyz/) provides tools to help developers create realtime applications.

## Javascript Client Library

> Be aware that this library is still in beta and not reached the first MAJOR version.
> 
> Semantic Versioning 2.0.0
>
> Major version zero (0.y.z) is for initial development. Anything may change at any time. The public API should not be considered stable.

This library is compatible with web browsers (compatible with RFC 6455).

Browser compatibility ([source](https://en.wikipedia.org/wiki/WebSocket#Browser_implementation)):

| Protocol, version | Draft date     | Internet Explorer | Firefox (PC, Android) | Chrome (PC, Mobile) | Safari (Mac, iOS) | Opera (PC, Mobile) | Android Browser |
| ----------------- | -------------- | ----------------- | --------------------- | ------------------- | ----------------- | ------------------ | --------------- |
| RFC 6455          | December, 2011 | 10                | 11                    | 16                  | 6                 | 12.10              | 4.4             |

This is a client library. If you are looking for a server library please check out our [list of libraries](https://broadcastt.xyz/docs/libraries).

For tutorials and more in-depth documentation, visit our [official site](https://broadcastt.xyz/).

## Documentation

### First steps

First you have to import the necessary library

ES6:

```javascript
import Broadcastt from 'broadcastt-js';
```

ES5:

```javascript
const Broadcastt = require('broadcastt-js');
```

Second you have to initialize a object

```javascript
const socket = new Broadcastt(APP_KEY);
```

### Configuration

```javascript
const socket = new Broadcastt(APP_KEY, options);
```

#### `host` (String)

The library tries to connect to the given host. By design this used by our development team, but you can change this any time.

Default value: `eu.broadcastt.xyz`

#### `port` (Number)

The library tries to connect to the given port. By design this used by our development team, but you can change this any time.

Default value: `443` or `80` depending on the value of `encrypted` option

#### `reconnectInterval` (Number)

If anything goes wrong and the client disconnects, the library will try to reconnect. The delay between the reconnection attempts is determined by this and the number of retries.

Calculated `this * <number of retries>`. Which means the delay is incremented linearly.

Default value: `3000`

#### `activityTimeout` (Number)

Can only be used by our development team, because the value given by you will be overridden after connection with the value sent by the server.

Default value: `120`

#### `pongTimeout` (Number)

Determines the acceptable timeout for the pong message sent by the server for a ping message.

May become deprecated in later versions because RFC 6455 has Control Frames for ping and pong messages.

Default value: `30`

#### `authEndpoint` (Number)

Relative or absolute url to be called by this library for private and presence channel authentication.

Default value: `/broadcasting/auth`

#### `csrf` (Number)

Cross-site request forgery token which will be set in the header as `X-CSRF-TOKEN` when calling the auth endpoint.

Default value: `null`

#### `encrypted` (Number)

Determines if `ws` or `wss` protocol should be called.

Default value: `true`

#### `debug` (Number)

If enabled the library will log events and method calls to the console.

Default value: `false`

#### `maximumReconnects` (Number)

Sets the maximum number of reconnects in a row. So if any reconnect attempts is successful the counter will reset.

Default value: `8`

### Subscription

#### Subscribe to Public channels

You can subscribe to a channel by invoking the `join` method of your socket object.

```javascript
const channel = socket.join('channel-name');
```

This returns a Channel object

#### Subscribe to Private or Presence channels

You can subscribe to a private or presence channel the same way you would do for a public channel you just has to add `private-` or `presence-` depending on the type of the desired channel. 

```javascript
const channel = socket.join('private-channel-name');
const channel = socket.join('presence-channel-name');
```

Additionally you can call the `private` or `presence` method of your socket object where you don't need to add the prefix.

```javascript
const channel = socket.private('channel-name');
const channel = socket.presence('channel-name');
```

If you already subscribed by calling these methods you get back the same objects as you did on the first call.

Private and presence channels will make a request to `authEndpoint` where you have to authenticate the subscription.

#### Unsubscribe

You can unsubscribe from a channel by calling the `unsubscribe` method of the channel object.

```javascript
channel.unsubscribe();
```

Or by calling the `leave` method of your socket object.

```javascript
socket.leave('channel-name');
```

### Events

#### Bind

You can bind callbacks to events by calling the `bind` method on a channel object.

```javascript
channel.bind('event-name', (payload) => {
    // Do what you want
});
```

Several callbacks can be added to the same event.

#### Unbind

You can remove all event bindings by calling `unbind` method on a channel object without any parameter. 

```javascript
channel.unbind();
```

You can also use the `unbind` method to remove every bindings of a event by calling it with a string parameter.

```javascript
channel.unbind('event-name');
```

Also the `unbind` method can remove a specific callback by calling it with that callback as a parameter.

```javascript
channel.unbind(null, your-callback-object);
```

Further more you can remove a specific callback from an event by passing the name and the callback.

```javascript
channel.unbind('event-name', your-callback-object);
```

## Contributing

We welcome everyone who would help us to make this library "Harder, Better, Faster, Stronger".
