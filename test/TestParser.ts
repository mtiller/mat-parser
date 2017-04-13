import { expect } from 'chai';
import { MatFile, blobReader, chunkReader, Handler } from '../src';
import { Observable } from 'rxjs';
import { files, counts, initialCounts, Tally, sampleFile } from './data';

class CountHandler implements Handler {
    public tally: Tally = { ...initialCounts };
    start(name: string) { this.tally["matrix"]++ }
    end(name: string) { this.tally["end"]++ }
    column() { this.tally["column"]++ }
    eof() { this.tally["eof"]++ }
    error() { this.tally["error"]++ }
}

function aggregate(obs: Observable<Buffer>): Promise<Buffer> {
    let ret = Buffer.alloc(0);
    return new Promise<Buffer>((resolve, reject) => {
        let sub = obs.subscribe((chunk) => {
            ret = Buffer.concat([ret, chunk]);
        }, (err) => {
            sub.unsubscribe();
            reject(err);
        }, () => {
            sub.unsubscribe();
            resolve(ret);
        })
    })
}

describe("Test readers", () => {
    for (let i = 0; i < files.length; i++) {
        let filename = files[i];
        it("should parse '" + filename + "' using chunk reader", async () => {
            let fullname = sampleFile(filename);
            let blob = await aggregate(blobReader(fullname));
            let chunked = await aggregate(chunkReader(fullname));
            expect(blob.length).to.equal(chunked.length, "Expected sizes to match");
            expect(blob).to.deep.equal(chunked);
        })
    }
})

describe("Test MATLAB parser", () => {
    for (let i = 0; i < files.length; i++) {
        let filename = files[i];
        it("should parse '"+filename+"' as observable streams", async () => {
            let fullname = sampleFile(filename);
            let obs = blobReader(fullname);
            let file = new MatFile(obs);
            let handler = new CountHandler();
            await file.parse(handler);
            expect(handler.tally).to.deep.equal(counts[filename]);
        })
    }
})