import PrivateChannel from './private-channel';
import {ChannelStatus} from "../status/channel-status";

class Members {
    public me: {user_id: String, user_info: any};
    public count: number;
    public ids: any[];
    public hash: any;
}

export default class PresenceChannel extends PrivateChannel {

    public members: Members;

    constructor(channel, shared) {
        super(channel, shared);

        this.members = new Members();
    }

    protected registerDefaultListeners() {
        this._listeners.push({
            event: 'broadcastt_internal:subscription_succeeded',
            callback: (e) => {
                this._status = ChannelStatus.Subscribed;
                this.members = Object.assign({}, this.members, e.presence);

                this.emit('broadcastt:subscription_succeeded', this.members);
            },
        });

        this._listeners.push({
            event: 'broadcastt_internal:member_added',
            callback: (e) => {
                this.members.count++;
                this.members.ids.push(e.user_id);
                this.members.hash[e.user_id] = e.user_info;

                this.emit('broadcastt:member_added', Object.assign({}, e), this.members);
            },
        });

        this._listeners.push({
            event: 'broadcastt_internal:member_removed',
            callback: (e) => {
                this.members.ids = this.members.ids.filter((i) => i !== e.user_id);
                delete this.members.hash[e.user_id];

                this.emit('broadcastt:member_removed', Object.assign({}, e), this.members);
            },
        });
    }

    protected onAjaxSuccess(response) {
        this.members.me = response;

        super.onAjaxSuccess(response);
    }

    protected onUnsubscribe() {
        this.members = new Members();
    }

    /**
     * Binds a callback to the `broadcastt:subscription_succeeded` event
     *
     * This event is called when the subscription succeeds.
     * The defined callback will be called with the data of the connected clients.
     *
     * @param callback
     */
    public here(callback: (members) => any) {
        this.bind('broadcastt:subscription_succeeded', callback);

        return this;
    }

    /**
     * Binds a callback to the `broadcastt:member_added` event
     *
     * This event is called when a new clients connects to the channel.
     * The defined callback will be called with the data of that clients.
     *
     * @param callback
     */
    public joining(callback: (e, members) => any) {
        this.bind('broadcastt:member_added', callback);

        return this;
    }

    /**
     * Binds a callback to the `broadcastt:member_removed` event
     *
     * This event is called when a clients disconnects from the channel.
     * The defined callback will be called with the id of that clients.
     *
     * @param callback
     */
    public leaving(callback: (e, members) => any) {
        this.bind('broadcastt:member_removed', callback);

        return this;
    }

}
