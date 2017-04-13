import { expect } from 'chai';
import { MatFile, blobReader, chunkReader, Handler } from '../src';
import { Observable } from 'rxjs';
import path = require('path');

function sampleFile(name: string) {
    if (process.env["NODE_ENV"] == "testing") {
        return path.join(__dirname, "..", "..", "samples", name);
    } else {
        return path.join(__dirname, "..", "samples", name);
    }
}

export const highLevelEvents = (e: Event) => {
    if (e.type == "matrix" || e.type == "end" || e.type == "eof") console.log(JSON.stringify(e));
}

type Tally = { [key: string]: number };

class CountHandler implements Handler {
    public tally: Tally = { ...initialCounts };
    start(name: string) { this.tally["matrix"]++ }
    end(name: string) { this.tally["end"]++ }
    column() { this.tally["column"]++ }
    eof() { this.tally["eof"]++ }
    error() { this.tally["error"]++ }
}

const initialCounts: Tally = {
    "matrix": 0,
    "column": 0,
    "end": 0,
    "eof": 0,
    "error": 0,
}

const counts = {
    "Comparison.mat": {
        matrix: 6,
        end: 6,
        eof: 1,
        column: 1243,
        error: 0,
    },
    "drvres.mat": {
        matrix: 6,
        end: 6,
        eof: 1,
        column: 85640,
        error: 0,
    }
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
    let files = Object.keys(counts);
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
    let files = Object.keys(counts);
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