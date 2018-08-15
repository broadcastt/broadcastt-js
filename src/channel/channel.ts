import Broadcastt from "../broadcastt";
import {ChannelStatus} from "../status/channel-status";
import {BroadcasttStatus} from "../status/broadcastt-status";

export default class Channel {

    protected _name: string;
    protected _listeners: { event: String, callback: Function }[];
    protected _status: ChannelStatus;

    protected _broadcastt: Broadcastt;

    constructor(channel: string, broadcastt: Broadcastt) {
        this._name = channel;
        this._broadcastt = broadcastt;
        this._listeners = [];
        this._status = ChannelStatus.None;
        this.registerDefaultListeners();
    }

    protected registerDefaultListeners() {
        this._listeners.push({
            event: 'broadcastt_internal:subscription_succeeded',
            callback: (e) => {
                this._status = ChannelStatus.Pending;

                this.emit('broadcastt:subscription_succeeded');
            },
        });
    }

    /**
     * Subscribe to this channel object
     */
    public subscribe(): this {
        if (this._broadcastt.status !== BroadcasttStatus.Reconnecting
            && (this._status === ChannelStatus.Pending || this._status === ChannelStatus.Subscribed)) {
            return this;
        }

        this._status = ChannelStatus.Pending;

        if (this._broadcastt.channels.indexOf(this) === -1) {
            this._broadcastt.channels.push(this);
        }

        this.onSubscribe();

        return this;
    }

    protected onSubscribe() {
        this._broadcastt.send('broadcastt:subscribe', {
            channel: this._name,
        });
    }

    /**
     * Unsubscribe from this channel object
     */
    public unsubscribe(): void {
        if (this._status === ChannelStatus.None || this._status === ChannelStatus.Unsubscribed) {
            return;
        }
        this._status = ChannelStatus.Unsubscribed;

        this._broadcastt.send('broadcastt:unsubscribe', {
            channel: this._name,
        });

        return;
    }

    protected onUnsubscribe() {
        //
    }

    /**
     * Binds a callback to an event
     *
     * @param event Name of the event
     * @param callback The callback which will be called on the event
     */
    public bind(event: string, callback: Function): this {
        if (!event || !callback) {
            return this;
        }

        if (event.startsWith('broadcastt_internal:')) {
            console.warn('You can not bind to internal events', event);
            return this;
        }

        const item = {
            event: event,
            callback: callback,
        };

        this._listeners.push(item);

        return this;
    }

    /**
     * Unbind callbacks from an event
     *
     * @param event Name of the event
     * @param callback The callback which will be used to filter out a specific callback
     */
    public unbind(event: string = null, callback: Function = null): this {
        if (event !== null && event.startsWith('broadcastt_internal:')) {
            console.warn('You can not unbind internal events', event);
            return this;
        }

        if (event === null && callback === null) {
            this._listeners = this._listeners.filter((o) => !o.event.startsWith('broadcastt_internal:'));
        } else if (event !== null && callback === null) {
            this._listeners = this._listeners.filter((o) => o.callback !== callback);
        } else if (event === null && callback !== null) {
            this._listeners = this._listeners.filter((o) => o.event !== event);
        } else {
            this._listeners = this._listeners.filter((o) => o.event !== event && o.callback !== callback);
        }

        return this;
    }

    /**
     * Emits a event with the specified parameters
     *
     * @param event Name of the event
     * @param parameters Parameters of the event
     */
    public emit(event: string, ...parameters: any[]) {
        const listener = this._listeners.find((o) => event === o.event);

        if (listener) {
            listener.callback(...parameters);
        }

        return this;
    }

    /**
     * Name of the channel
     */
    get name(): string {
        return this._name;
    }

    /**
     * ChannelStatus of the channel
     */
    get status(): ChannelStatus {
        return this._status;
    }
}
