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
        it("should get the same answer if invoked twice", async () => {
            let fullname = sampleFile(filename);
            let blob1 = await aggregate(blobReader(fullname));
            let blob2 = await aggregate(blobReader(fullname));
            expect(blob1.length).to.equal(blob2.length, "Expected sizes to match");
            expect(blob1).to.deep.equal(blob2);
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

        it("should get the same results if parsed twice", async () => {
            let fullname = sampleFile(filename);
            let obs1 = blobReader(fullname);
            let file1 = new MatFile(obs1);
            let handler1 = new CountHandler();
            await file1.parse(handler1);

            let obs2 = blobReader(fullname);
            let file2 = new MatFile(obs2);
            let handler2 = new CountHandler();
            await file2.parse(handler2);

            expect(handler1.tally).to.deep.equal(counts[filename]);
            expect(handler2.tally).to.deep.equal(counts[filename]);
        })
    }
})