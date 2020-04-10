import Channel from './channel/channel';
import PrivateChannel from './channel/private-channel';
import PresenceChannel from './channel/presence-channel';
import Options from './options';
import {BroadcasttStatus} from "./status/broadcastt-status";
import {ChannelStatus} from "./status/channel-status";

export default class Broadcastt {

    private static SECOND = 1000;

    public static defaultOptions: any = {
        host: 'eu.broadcastt.xyz',
        port: 443,
        reconnectInterval: 3 * Broadcastt.SECOND,
        activityTimeout: 120,
        pongTimeout: 30,
        authEndpoint: '/broadcasting/auth',
        csrf: '',
        encrypted: true,
        debug: false,
        maximumReconnects: 8,
    };

    private _key: string;
    private _numberOfReconnects: number;
    private _options: Options;
    private _status: BroadcasttStatus;
    private _channels: Channel[];
    private _url: string;
    private _socket: WebSocket;
    private _socketId: any;
    private _errorCode: number | null;
    private _activityTimer: any;

    constructor(key: string, options?: Options) {
        this._key = key;
        this._numberOfReconnects = 0;

        this._options = Object.assign({}, Broadcastt.defaultOptions, options);
        if (options && options.port === undefined && options.encrypted === false) {
            this._options.port = 80;
        }

        const scheme = this._options.encrypted ? 'wss' : 'ws';
        this._url = scheme + '://' + this._options.host + ':' + this._options.port + '/apps/' + this._key;

        this._status = BroadcasttStatus.Connecting;
        this._channels = [];
        this._socket = new WebSocket(this._url);

        this._socketId = null;
        this._errorCode = null;
        this._activityTimer = null;

        this.reset();
    }

    protected reset(): void {
        this._socketId = null;
        this._errorCode = null;

        if (this._socket.readyState === WebSocket.CLOSED || this._socket.readyState === WebSocket.CLOSING) {
            this._socket = new WebSocket(this._url);
        }

        this._socket.onopen = (e) => {
            this.onOpen(e);
        };

        this._socket.onerror = (e) => {
            this.onError(e);
        };

        this._socket.onmessage = (e) => {
            const payload = JSON.parse(e.data);
            this.onMessage(payload);
        };

        this._socket.onclose = (e) => {
            this.onClose(e);
        };
    }

    private onOpen(e: any): void {
        this._numberOfReconnects = 0;

        if (this._options.debug) {
            console.log('Broadcastt: Connected')
        }
    }

    private onMessage(payload: any): void {
        const data = JSON.parse(payload.data);

        switch (payload.event) {
            case 'broadcastt:connection_established':
                this._options.activityTimeout = data.activity_timeout;
                this._socketId = data.socket_id;
                this.activityCheck();

                this._channels.forEach((channel) => {
                    if (channel.status === ChannelStatus.Unsubscribed) {
                        return;
                    }
                    channel.subscribe();
                });

                this._status = BroadcasttStatus.Connected;
                return;
            case 'broadcastt:pong':
                this.activityCheck();
                return;
            case 'broadcastt:error':
                this._status = BroadcasttStatus.Error;
                this._errorCode = data.code;
                if (payload.data.code !== undefined) {
                    this._socket.close(data.code, data.message);
                }
                return;
        }

        this._channels.forEach((channel) => {
            if (channel.name !== payload.channel) {
                return;
            }

            channel.emit(payload.event, data);
        });
    }

    private onError(e: any) {
        if (this._options.debug) {
            console.error('Broadcastt: Error occurred', e)
        }
    }

    private onClose(e: any) {
        if (this._options.debug) {
            console.log('Broadcastt: Disconnected', e)
        }

        if (this._errorCode && 3999 < this._errorCode && this._errorCode < 4100) {
            return;
        }

        const maximumReconnects = this._options.maximumReconnects ?? Broadcastt.defaultOptions.maximumReconnects;
        if (this._numberOfReconnects >= maximumReconnects) {
            return;
        }
        this._numberOfReconnects++;

        this._status = BroadcasttStatus.Reconnecting;
        let timeout: number;
        if (this._errorCode && 4199 < this._errorCode && this._errorCode < 4200) {
            timeout = 0;
        } else {
            const reconnectInterval = this._options.reconnectInterval ?? Broadcastt.defaultOptions.reconnectInterval;
            timeout = (this._numberOfReconnects * reconnectInterval);
        }

        setTimeout(() => {
            this.reset();
        }, timeout);

        if (this._options.debug) {
            console.log('Broadcastt: Try to reconnect in ' + (timeout / Broadcastt.SECOND) + 's')
        }
    }

    private activityCheck() {
        if (this._activityTimer) {
            clearTimeout(this._activityTimer);
        }

        const activityTimeout = this._options.activityTimeout ?? Broadcastt.defaultOptions.activityTimeout;
        this._activityTimer = setTimeout(() => {
            this.send('broadcastt:ping', {});

            const pongTimeout = this._options.pongTimeout ?? Broadcastt.defaultOptions.pongTimeout;
            this._activityTimer = setTimeout(() => {
                this._socket.close();
            }, (pongTimeout * Broadcastt.SECOND))
        }, (activityTimeout * Broadcastt.SECOND))
    }

    /**
     * Returns a {@link Channel} object from the channel pool where the name matches and null otherwise
     *
     * @param name
     *
     * @return null|Channel
     */
    public get(name: string): Channel | null {
        let channel = this._channels.find((c) => c.name === name);
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
                channel = new PrivateChannel(name, this);
            } else if (name.startsWith('presence-')) {
                channel = new PresenceChannel(name, this);
            } else {
                channel = new Channel(name, this);
            }
            this._channels.push(channel);
        }
        if (this._status === BroadcasttStatus.Connected) {
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
        let channel = this._channels.find((c) => c.name === name);
        if (!channel) {
            return;
        }
        channel.unsubscribe();
    }

    /**
     * Sends the specified event to be transmitted to the server over the WebSocket connection
     *
     * @param event
     * @param data
     */
    public send(event: string, data: any): void {
        this._socket.send(JSON.stringify({
            event: event,
            data: data,
        }))
    }

    /**
     * The key of the Broadcastt connection
     */
    get key(): string {
        return this._key;
    }

    get options(): Options {
        return this._options;
    }

    get status(): BroadcasttStatus {
        return this._status;
    }

    get channels(): Channel[] {
        return this._channels;
    }

    get socketId(): any {
        return this._socketId;
    }

    get errorCode(): number | null {
        return this._errorCode;
    }

    get activityTimer(): any {
        return this._activityTimer;
    }
}
