import { files, sampleFile, signals } from './data';
import { blobReader, MatFile, DymolaResultsExtractor } from '../src';
import { expect } from 'chai';

describe("Test Dymola results processing", () => {
    for (let i = 0; i < files.length; i++) {
        let filename = files[i];
        it("should parse results from '" + filename + "'", async () => {
            let fullname = sampleFile(filename);
            let obs = blobReader(fullname);
            let file = new MatFile(obs);
            let sig = signals[filename];
            expect(sig).to.not.equal(undefined);
            let trajs = sig.trajs;
            let finals = sig.finals;
            let handler = new DymolaResultsExtractor((n) => Object.keys(trajs).indexOf(n)>=0, (n) => Object.keys(finals).indexOf(n)>=0);
            await file.parse(handler);
            expect(Object.keys(handler.trajectories)).to.deep.equal(Object.keys(trajs));
            expect(Object.keys(handler.finals)).to.deep.equal(Object.keys(finals));
            Object.keys(trajs).forEach((key) => {
                let exp = trajs[key];
                let t = handler.trajectories[key];
                if (Array.isArray(t)) {
                    expect(t.length).to.equal(exp);
                } else {
                    expect(1).to.equal(exp, "Length mismatch for "+key);
                }
            })
            Object.keys(finals).forEach((key) => {
                let exp = finals[key];
                let val = handler.finals[key];
                expect(val).to.not.equal(undefined, "No final value for "+key);
                expect(val).to.equal(exp, "Disagreement in final value of "+key);
            })
        })
    }
})