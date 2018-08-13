import Channel from './channel';

export default class PrivateChannel extends Channel {

    /**
     * Sends an event to the protected channel
     *
     * @param event Name of the event
     * @param data Data of the event
     */
    public send(event: string, data) {
        if (event.startsWith('broadcastt:')) {
            console.warn('You can not send broadcastt events', event);
            return this;
        } else if (event.startsWith('broadcastt_internal:')) {
            console.warn('You can not send internal broadcastt events', event);
            return this;
        }

        this._shared.socket.send(JSON.stringify({
            event: event,
            data: data,
            channel: this.name
        }));

        return this;
    }

    protected onSubscribe(): void {
        const xmlHttp = new XMLHttpRequest();
        xmlHttp.open('POST', this._shared.auth_endpoint);
        xmlHttp.setRequestHeader('Content-Type', 'application/json');
        if (this._shared.csrf) {
            xmlHttp.setRequestHeader('X-CSRF-TOKEN', this._shared.csrf);
        }
        xmlHttp.onload = () => {
            if (xmlHttp.status === 200 && xmlHttp.responseText) {
                this.onAjaxSuccess(JSON.parse(xmlHttp.responseText));
            }
        };

        let name = this.name;

        xmlHttp.send(JSON.stringify({
            socket_id: this._shared.socket_id,
            channel_name: name
        }));
    }

    protected onAjaxSuccess(response): void {
        const data = Object.assign({}, response);
        data.channel = this.name;

        this._shared.socket.send(JSON.stringify({
            event: 'broadcastt:subscribe',
            data: data,
        }));
    }

}
