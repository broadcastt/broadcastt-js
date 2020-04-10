import PrivateChannel from './private-channel';
import {ChannelStatus} from '../status/channel-status';
import Broadcastt from '../broadcastt';

interface Member {
    user_id: string;
    user_info: any;
}

interface Members {
    me: Member;
    count: number;
    ids: any[];
    hash: any;
}

export default class PresenceChannel extends PrivateChannel {

    public members?: Members;

    constructor(channel: string, shared: Broadcastt) {
        super(channel, shared);
    }

    protected registerDefaultListeners() {
        this._listeners.push({
            event: 'broadcastt_internal:subscription_succeeded',
            callback: (e: any) => {
                this._status = ChannelStatus.Subscribed;
                this.members = Object.assign({}, this.members, e.presence);

                this.emit('broadcastt:subscription_succeeded', this.members);
            },
        });

        this._listeners.push({
            event: 'broadcastt_internal:member_added',
            callback: (e: Member) => {
                if (this.members) {
                    this.members.count++;
                    this.members.ids.push(e.user_id);
                    this.members.hash[e.user_id] = e.user_info;
                }

                this.emit('broadcastt:member_added', Object.assign({}, e), this.members);
            },
        });

        this._listeners.push({
            event: 'broadcastt_internal:member_removed',
            callback: (e: Member) => {
                if (this.members) {
                    this.members.ids = this.members.ids.filter((i) => i !== e.user_id);
                    delete this.members.hash[e.user_id];
                }

                this.emit('broadcastt:member_removed', Object.assign({}, e), this.members);
            },
        });
    }

    protected onAjaxSuccess(response: Member) {
        if (this.members) {
            this.members.me = response;
        }

        super.onAjaxSuccess(response);
    }

    protected onUnsubscribe() {
        this.members = undefined;
    }

    /**
     * Binds a callback to the `broadcastt:subscription_succeeded` event
     *
     * This event is called when the subscription succeeds.
     * The defined callback will be called with the data of the connected clients.
     *
     * @param callback
     */
    public here(callback: (members: Members) => any) {
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
    public joining(callback: (e: Member, members: Members) => any) {
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
    public leaving(callback: (e: Member, members: Members) => any) {
        this.bind('broadcastt:member_removed', callback);

        return this;
    }

}
