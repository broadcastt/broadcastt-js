import Channel from './channel';
import PrivateChannel from './private-channel';
import PresenceChannel from './presence-channel';

export default class Broadcastt {
    private static SECOND = 1000;

    private _key: string;
    private _reconnect: number;
    private _options: any;
    private _status: string;
    private _shared: {
        csrf: string,
        channels: Channel[],
        socket: WebSocket,
        socket_id: any,
        auth_endpoint: string,
    };
    private _errorCode: number;
    private _activityTimer;

    private static defaultOptions = {
        host: 'eu.broadcastt.xyz',
        port: 443,
        reconnect_interval: 3 * Broadcastt.SECOND,
        activity_timeout: 120,
        pong_timeout: 30,
        auth_endpoint: '/broadcasting/auth',
        csrf: null,
        encrypted: true,
        debug: false,
        maximum_reconnects: 8,
    };

    constructor(key: string, options?: any) {
        this._key = key;
        this._reconnect = 0;

        this._options = Object.assign({}, Broadcastt.defaultOptions, options);
        if (options.port === undefined && options.encrypted === false) {
            this._options.port = 80;
        }

        this._status = 'connecting';
        this._shared = {
            csrf: this._options.csrf,
            channels: [],
            socket: null,
            socket_id: null,
            auth_endpoint: this._options.auth_endpoint,
        };

        this.init();
    }

    protected init(): void {
        const scheme = this._options.encrypted ? 'wss' : 'ws';

        const url = scheme + '://' + this._options.host + ':' + this._options.port + '/apps/' + this._key;

        this._shared.socket = new WebSocket(url);

        this._shared.socket.onopen = (e) => {
            this.onopen(e);
        };

        this._shared.socket.onerror = (e) => {
            this.onerror(e);
        };

        this._shared.socket.onmessage = (e) => {
            const payload = JSON.parse(e.data);
            this.onmessage(payload);
        };

        this._shared.socket.onclose = (e) => {
            this.onclose(e);
        };
    }

    private onopen(e): void {
        this._reconnect = 0;

        if (this._options.debug) {
            console.log('Broadcastt: Connected')
        }
    }

    private onmessage(payload): void {
        const data = JSON.parse(payload.data);

        switch (payload.event) {
            case 'broadcastt:connection_established':
                this._options.activity_timeout = data.activity_timeout;
                this._shared.socket_id = data.socket_id;
                this.activityCheck();
                this._status = 'connected';

                this._shared.channels.forEach((channel) => {
                    if (channel.status === 'unsubscribed') {
                        return;
                    }
                    channel.subscribe();
                });
                return;
            case 'broadcastt:pong':
                this.activityCheck();
                return;
            case 'broadcastt:error':
                this._status = 'error';
                this._errorCode = data.code;
                if (payload.data.code !== undefined) {
                    this._shared.socket.close(data.code, data.message);
                }
                return;
        }

        this._shared.channels.forEach((channel) => {
            if (channel.name !== payload.channel) {
                return;
            }

            channel.emit(payload.event, data);
        });
    }

    private onerror(e) {
        if (this._options.debug) {
            console.error('Broadcastt: Error occurred', e)
        }
    }

    private onclose(e) {
        if (this._options.debug) {
            console.log('Broadcastt: Disconnected', e)
        }

        this._shared.socket_id = undefined;

        if (3999 < this._errorCode && this._errorCode < 4100) {
            return;
        }

        if (this._reconnect < this._options.maximum_reconnects && (this._status === 'connecting' || this._status === 'connected')) {
            const instance = this;
            let timeout: number;
            if (4199 < this._errorCode && this._errorCode < 4200) {
                timeout = 0;
            } else {
                timeout = (instance._reconnect * this._options.reconnect_interval);
            }
            instance._reconnect++;
            setTimeout(() => {
                instance.init();
            }, timeout);

            if (this._options.debug) {
                console.log('Broadcastt: Try to reconnect in ' + (timeout / Broadcastt.SECOND) + 's')
            }
        }
    }

    private activityCheck() {
        if (this._activityTimer) {
            clearTimeout(this._activityTimer);
        }

        this._activityTimer = setTimeout(() => {
            this._shared.socket.send(JSON.stringify({
                event: 'broadcastt:ping',
                data: {},
            }));

            this._activityTimer = setTimeout(() => {
                this._shared.socket.close();
            }, (this._options.pong_timeout * Broadcastt.SECOND))
        }, (this._options.activity_timeout * Broadcastt.SECOND))
    }

    /**
     * Returns a {@link Channel} object from the channel pool
     *
     * @param name
     *
     * @return null|Channel
     */
    public get(name: string): Channel {
        let channel = this._shared.channels.find((c) => c.name === name);
        if (channel) {
            return channel;
        }
        return null;
    }

    /**
     * Subscribe to a channel by defining a channel name.
     *
     * If the connection is not initialised yet the subscription will be executed after the initialisation.
     *
     * If you already subscribed by calling this methods you get back the same objects as you did on the first call.
     *
     * @param name
     *
     * @return Channel
     */
    public join(name: string): Channel {
        let channel = this.get(name);
        if (channel === null) {
            if (name.startsWith('private-')) {
                channel = new PrivateChannel(name, this._shared);
            } else if (name.startsWith('presence-')) {
                channel = new PresenceChannel(name, this._shared);
            } else {
                channel = new Channel(name, this._shared);
            }
            this._shared.channels.push(channel);
        }
        if (this._status === 'connected') {
            channel.subscribe();
        }
        return channel;
    }

    /**
     * Subscribe to a private channel by defining the suffix of the channel name.
     *
     * @param name
     *
     * @return PrivateChannel
     */
    public private(name: string): PrivateChannel {
        return this.join('private-' + name) as PrivateChannel;
    }

    /**
     * Subscribe to a presence channel by defining the suffix of the channel name.
     *
     * @param name
     *
     * @return PresenceChannel
     */
    public presence(name: string): PresenceChannel {
        return this.join('presence-' + name) as PresenceChannel;
    }

    /**
     * Unsubscribe from a channel by defining a channel name.
     *
     * @param name
     */
    public leave(name: string): void {
        let channel = this._shared.channels.find((c) => c.name === name);
        if (!channel) {
            return;
        }
        channel.unsubscribe();
    }

    /**
     * The key of the Broadcastt connection
     */
    get key(): string {
        return this._key;
    }
}
