import PrivateChannel from "./private-channel";

class Members {
    public me: {user_id: String, user_info: any};
    public count: number;
    public ids: any[];
    public hash: any;
}

export default class PresenceChannel extends PrivateChannel {

    protected onhere: (members) => any;
    protected onjoin: (e, members) => any;
    protected onleave: (e, members) => any;
    public members: Members;

    constructor(channel, connection, auth_endpoint) {
        super(channel, connection, auth_endpoint);

        this.members = new Members();

        this.onhere = () => {};
        this.onjoin = () => {};
        this.onleave = () => {};
    }

    protected registerDefaultListeners() {
        this.listeners.push({
            event: 'broadcastt_internal:subscription_succeeded',
            callback: (e) => {
                this.status = "subscribed";
                this.members = Object.assign({}, this.members, e.members);
                this.onhere(this.members);
            },
        });

        this.listeners.push({
            event: 'broadcastt_internal:member_added',
            callback: (e) => {
                this.members.count++;
                this.members.ids.push(e.user_id);
                this.members.hash[e.user_id] = e.user_info;

                this.onjoin(Object.assign({}, e), this.members);
            },
        });

        this.listeners.push({
            event: 'broadcastt_internal:member_removed',
            callback: (e) => {
                this.members.ids = this.members.ids.filter((i) => i !== e.user_id);
                delete this.members.hash[e.user_id];

                this.onleave(Object.assign({}, e), this.members);
            },
        });
    }

    protected onAjaxSuccess(response) {
        this.members.me = response;
        super.onAjaxSuccess(response);
    }

    public here(callback: (members) => any) {
        this.onhere = callback;

        return this;
    }

    public joining(callback: (e, members) => any) {
        this.onjoin = callback;

        return this;
    }

    public leaving(callback: (e, members) => any) {
        this.onleave = callback;

        return this;
    }

}
