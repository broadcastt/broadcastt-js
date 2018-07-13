import Channel from "./channel";

export default class PrivateChannel extends Channel {

    public send(event: string, data) {
        this.shared.socket.send(JSON.stringify({
            event: event,
            data: data,
            channel: this.name
        }));
    }

    public subscribe(): this {
        if (this.status !== "none") {
            return this;
        }
        this.status = "pending";

        const xmlHttp = new XMLHttpRequest();
        xmlHttp.open('POST', this.auth_endpoint);
        xmlHttp.setRequestHeader('Content-Type', 'application/json');
        if (this.shared.csrf) {
            xmlHttp.setRequestHeader('X-CSRF-TOKEN', this.shared.csrf);
        }
        xmlHttp.onload = () => {
            if (xmlHttp.status === 200 && xmlHttp.responseText) {
                this.onAjaxSuccess(JSON.parse(xmlHttp.responseText));
            }
        };

        let name = this.name;

        xmlHttp.send(JSON.stringify({
            socket_id: this.shared.socket_id,
            channel_name: name
        }));

        return this;
    }

    protected onAjaxSuccess(response): void {
        const data = Object.assign({}, response);
        data.channel = this.name;

        this.shared.socket.send(JSON.stringify({
            event: 'broadcastt:subscribe',
            data: data,
        }));
    }

}
