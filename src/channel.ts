export default class Channel {

    public name: string;
    public listeners: {event: String, callback: Function, name?: String}[];
    public status: string;

    protected shared: {
        csrf: string,
        channels: Channel[],
        socket: WebSocket,
        socket_id: any,
    };
    protected auth_endpoint: string;

    constructor(channel, connection, auth_endpoint) {
        this.name = channel;
        this.shared = connection;
        this.auth_endpoint = auth_endpoint;
        this.listeners = [];
        this.status = "none";
        this.registerDefaultListeners();
    }

    protected registerDefaultListeners() {
        this.listeners.push({
            event: 'broadcastt_internal:subscription_succeeded',
            callback: (e) => {
                this.status = "subscribed";
            },
        });
    }

    public subscribe(): this {
        if (this.status !== "none") {
            return this;
        }
        this.status = "pending";
        if (this.shared.channels.indexOf(this) === -1) {
            this.shared.channels.push(this);
        }

        this.shared.socket.send(JSON.stringify({
            event: 'broadcastt:subscribe',
            data: {
                channel: this.name,
            },
        }));

        return this;
    }

    public unsubscribe(): void {
        if (this.status !== "subscribed") {
            return;
        }
        this.status = "unsubscribed";

        this.shared.socket.send(JSON.stringify({
            event: 'broadcastt:unsubscribe',
            data: {
                channel: this.name,
            },
        }));

        return;
    }

    public bind(event: string, callback, name?: string): this {
        if (!event || !callback) {
            return this;
        }

        const item = {
            event: event,
            callback: callback,
            name: event,
        };

        if (name) {
            item.name = name;
        }

        this.listeners.push(item);

        return this;
    }

    public unbind(name: string|Function): this {
        if (!name) {
            this.listeners = this.listeners.filter((o) => o.name === undefined);

            return this;
        }

        if (typeof name === "function") {
            this.listeners = this.listeners.filter((o) => o.callback !== name);

            return this;
        }

        this.listeners = this.listeners.filter((o) => o.name !== name);

        return this;
    }

}
