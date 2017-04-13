import { Subject } from 'rxjs';
import fs = require('fs');

export function blobReader(filename: string) {
    let subj = new Subject<Buffer>();
    fs.readFile(filename, (err, data) => {
        if (err) subj.error(err);
        else {
            subj.next(data);
            subj.complete();
        }
    })
    return subj;
}

export function chunkReader(filename: string) {
    let count = 0;
    let subj = new Subject<Buffer>();
    let stream = fs.createReadStream(filename, {});
    stream.on('data', (chunk: Buffer) => {
        count += chunk.length;
        subj.next(chunk);
    })
    stream.on('end', () => {
        subj.complete();
    })
    stream.on('error', (e: Error) => {
        subj.error(e);
    })
    return subj;
}