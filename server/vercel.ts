import type {IncomingMessage,ServerResponse} from 'node:http';
// Only the Node HTTP subset used by this app. Vercel supplies these helpers;
// the deployment builder is not a dependency of the application runtime.
export interface VercelRequest extends IncomingMessage {
    query:Record<string,string|string[]|undefined>;
    body?:unknown;
}
export interface VercelResponse extends ServerResponse {
    status(code:number):VercelResponse;
    json(value:unknown):VercelResponse;
}
