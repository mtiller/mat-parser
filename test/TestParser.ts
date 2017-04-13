import { expect } from 'chai';
import { MatFile, Event, blobReader } from '../src';
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

export const countEvent = (tally: Tally) => {
    return (e: Event) => {
        tally[e.type]++;
    }
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
    }
}
describe("Test MATLAB parser", () => {
    it("should parse samples as observable streams", async () => {
        let files = Object.keys(counts);
        for (let i = 0; i < files.length; i++) {
            let filename = files[i];
            let tally: Tally = { ...initialCounts };
            let fullname = sampleFile(filename);
            let obs = blobReader(fullname);
            let file = new MatFile(obs);
            await file.parse(countEvent(tally));
            expect(tally).to.deep.equal(counts[filename]);
        }
    })
    // it.skip("should parse an existing MATLAB file as a single blob", async () => {
    //     let file = new MatFile(sampleFile("Comparison.mat"));
    //     let tally: Tally = { ...initialCounts };
    //     await file.blob(countEvent(tally));
    //     //await file.blob(highLevelEvents);  
    //     expect(tally).to.deep.equal({
    //         matrix: 6,
    //         end: 6,
    //         eof: 1,
    //         column: 1243,
    //         error: 0,
    //     })
    // })
    // it.skip("should parse an existing MATLAB file", async () => {
    //     let file = new MatFile(sampleFile("Comparison.mat"));
    //     await file.chunks(highLevelEvents);
    //     // new MatFile(sampleFile, (e) => {
    //     //     if (e.type == "column" && e.format == MatrixType.Text) {
    //     //         //console.log("Column = ", Buffer.from(e.column).toString('ascii'));
    //     //     } else {
    //     //         console.log("Event: " + JSON.stringify(e));
    //     //     }
    //     // });
    //     //let emitter: NodeJS.EventEmitter = matlabParser(sampleFile);
    // })
    // it.skip("should parse an existing MATLAB file as a stream", async () => {
    //     let file = new MatFile(sampleFile("Comparison.mat"));
    //     file.stream(highLevelEvents);
    // })
})