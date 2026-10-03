import {Promise} from 'es6-promise';
import {ScreenshotRequest} from './types';

interface ScreenshotTransport {
    status?: number;
    timeout: number;
    onload: (() => void) | null;
    onerror: (() => void) | null;
    onprogress: (() => void) | null;
    ontimeout: (() => void) | null;
    open(method: string, url: string, async?: boolean): void;
    send(body: string): void;
}

// IE9 may collect an XDomainRequest while its native send is still pending.
const pendingRequests: ScreenshotTransport[] = [];

export const uploadScreenshot = (request: ScreenshotRequest): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        const standard = new XMLHttpRequest();
        const legacy = !('withCredentials' in standard);
        const XDR = (window as unknown as {XDomainRequest: new () => ScreenshotTransport}).XDomainRequest;
        const xhr = legacy ? new XDR() : (standard as unknown as ScreenshotTransport);
        const body = JSON.stringify(request);
        let settled = false;
        pendingRequests.push(xhr);

        const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            pendingRequests.splice(pendingRequests.indexOf(xhr), 1);
            if (error) reject(error);
            else resolve();
        };

        xhr.onload = () => {
            if (typeof xhr.status !== 'number' || xhr.status === 200) finish();
            else finish(new Error(`Failed to send screenshot with status ${xhr.status}`));
        };
        xhr.onerror = () => finish(new Error('Failed to send screenshot'));
        xhr.ontimeout = () => finish(new Error('Screenshot upload timed out'));
        // XDR needs a progress handler even when no progress UI is displayed.
        xhr.onprogress = () => {};

        const send = () => {
            if (settled) return;
            try {
                xhr.send(body);
            } catch (error) {
                finish(error instanceof Error ? error : new Error(String(error)));
            }
        };
        try {
            if (legacy) xhr.open('POST', 'http://localhost:8000/screenshot');
            else xhr.open('POST', 'http://localhost:8000/screenshot', true);
            xhr.timeout = 30000;
            // Defer only the legacy transport so it can initialize its native events.
            if (legacy) setTimeout(send, 0);
            else send();
        } catch (error) {
            finish(error instanceof Error ? error : new Error(String(error)));
        }
    });
