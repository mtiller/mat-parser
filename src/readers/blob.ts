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
