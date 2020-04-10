export default interface Options {
    host?: string;
    port?: number;
    reconnectInterval?: number;
    activityTimeout?: number;
    pongTimeout?: number;
    authEndpoint?: string;
    csrf?: string;
    encrypted?: boolean;
    debug?: boolean;
    maximumReconnects?: number;
}
