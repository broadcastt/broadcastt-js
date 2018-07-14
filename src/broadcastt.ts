import Channel from "./channel";
import PrivateChannel from "./private-channel";
import PresenceChannel from "./presence-channel";

export default class Broadcastt {
    private static SECOND = 1000;

    private key: string;
    private reconnect: number;
    private options: any;
    private status: string;
    private shared: {
        csrf: string,
        channels: Channel[],
        socket: WebSocket,
        socket_id: any,
    };
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
        this.key = key;
        this.reconnect = 0;

        this.options = Object.assign({}, Broadcastt.defaultOptions, options);
        if (options.port === undefined && options.encrypted === false) {
            this.options.port = 80;
        }

        this.status = "connecting";
        this.shared = {
            csrf: this.options.csrf,
            channels: [],
            socket: null,
            socket_id: null,
        };

        this.init();
    }

    protected init(): void {
        const protocol = this.options.encrypted ? 'wss' : 'ws';

        const url = protocol + '://' + this.options.host + ':' + this.options.port + '/apps/' + this.key;

        this.shared.socket = new WebSocket(url);

        this.shared.socket.onopen = (e) => {
            this.onopen(e);
        };

        this.shared.socket.onerror = (e) => {
            this.onerror(e);
        };

        this.shared.socket.onmessage = (e) => {
            const payload = JSON.parse(e.data);
            if (payload.event === 'broadcastt:connection_established') {
                const data = JSON.parse(payload.data);
                this.options.activity_timeout = data.activity_timeout;
                this.shared.socket_id = data.socket_id;
                this.activityCheck();
                this.status = "connected";

                this.shared.channels.forEach((channel) => {
                    channel.subscribe();
                });
                return;
            }

            this.onmessage(payload);
        };

        this.shared.socket.onclose = (e) => {
            this.onclose(e);
        };
    }

    private onopen(e): void {
        this.reconnect = 0;

        if (this.options.debug) {
            console.log('Broadcastt: Connected')
        }
    }

    private onmessage(payload): void {
        if (payload.event === 'broadcastt:pong') {
            this.activityCheck();
            return;
        }

        if (payload.event === 'broadcastt:error') {
            this.status = "error";
            this.shared.socket.close(payload.data.code, payload.data.message);
            return;
        }

        this.shared.channels.forEach((channel) => {
            if (channel.name !== payload.channel) {
                return;
            }

            channel.listeners.forEach((listener) => {
                if (listener.event !== payload.event) {
                    return;
                }

                listener.callback(JSON.parse(payload.data));
            });
        })
    }

    private onerror(e) {
        if (this.options.debug) {
            console.error('Broadcastt: Error occurred', e)
        }
    }

    private onclose(e) {
        if (this.options.debug) {
            console.log('Broadcastt: Disconnected', e)
        }

        this.shared.socket_id = undefined;
        this.shared.channels.forEach((channel) => {
            if (channel.status !== "unsubscribed") {
                channel.status = "none";
            }
        });

        if (this.reconnect < this.options.maximum_reconnects && (this.status === "connecting" || this.status === "connected")) {
            const instance = this;
            const timeout = (instance.reconnect++ * this.options.reconnect_interval);
            setTimeout(() => {
                instance.init();
            }, timeout);

            if (this.options.debug) {
                console.log('Broadcastt: Try to reconnect in ' + (timeout / Broadcastt.SECOND) + 's')
            }
        }
    }

    private activityCheck() {
        if (this._activityTimer) {
            clearTimeout(this._activityTimer);
        }

        this._activityTimer = setTimeout(() => {
            this.shared.socket.send(JSON.stringify({
                event: 'broadcastt:ping',
                data: {},
            }));

            this._activityTimer = setTimeout(() => {
                this.shared.socket.close();
            }, (this.options.pong_timeout * Broadcastt.SECOND))
        }, (this.options.activity_timeout * Broadcastt.SECOND))
    }

    public get(name: string): Channel {
        let channel = this.shared.channels.find((c) => c.name === name);
        if (channel) {
            return channel;
        }
        return null;
    }

    public join(name: string): Channel {
        let channel = this.get(name);
        if (channel === null) {
            if (name.startsWith('private-')) {
                channel = new PrivateChannel(name, this.shared, this.options.auth_endpoint);
            } else if (name.startsWith('presence-')) {
                channel = new PresenceChannel(name, this.shared, this.options.auth_endpoint);
            } else {
                channel = new Channel(name, this.shared, this.options.auth_endpoint);
            }
            this.shared.channels.push(channel);
        }
        if (this.status === "connected") {
            channel.subscribe();
        } else {
            channel.status = "none";
        }
        return channel;
    }

    public private(name: string): PrivateChannel {
        return this.join('private-' + name) as PrivateChannel;
    }

    public presence(name: string): PresenceChannel {
        return this.join('presence-' + name) as PresenceChannel;
    }

    public leave(name: string): void {
        let channel = this.shared.channels.find((c) => c.name === name);
        if (!channel) {
            return;
        }
        channel.unsubscribe();
    }
}
