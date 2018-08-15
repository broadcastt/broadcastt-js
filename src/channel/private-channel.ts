import Channel from './channel';

export default class PrivateChannel extends Channel {

    /**
     * Sends an event to the protected channel
     *
     * @param event Name of the event
     * @param data Data of the event
     */
    public send(event: string, data: object) {
        if (event.startsWith('broadcastt:')) {
            console.warn('You can not send broadcastt events', event);
            return this;
        } else if (event.startsWith('broadcastt_internal:')) {
            console.warn('You can not send internal broadcastt events', event);
            return this;
        }

        this._broadcastt.send(event, data);

        return this;
    }

    protected onSubscribe(): void {
        const xmlHttp = new XMLHttpRequest();
        xmlHttp.open('POST', this._broadcastt.options.authEndpoint);
        xmlHttp.setRequestHeader('Content-Type', 'application/json');
        if (this._broadcastt.options.csrf) {
            xmlHttp.setRequestHeader('X-CSRF-TOKEN', this._broadcastt.options.csrf);
        }
        xmlHttp.onload = () => {
            if (xmlHttp.status === 200 && xmlHttp.responseText) {
                this.onAjaxSuccess(JSON.parse(xmlHttp.responseText));
            }
        };

        let name = this.name;

        xmlHttp.send(JSON.stringify({
            socket_id: this._broadcastt.socketId,
            channel_name: name
        }));
    }

    protected onAjaxSuccess(response): void {
        const data = Object.assign({}, response);
        data.channel = this.name;

        this._broadcastt.send('broadcastt:subscribe', data);
    }

}
