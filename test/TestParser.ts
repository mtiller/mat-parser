//import { expect } from 'chai';
import { MatFile } from '../src';
import path = require('path');

const sampleFile = path.join(__dirname, "..", "samples", "drvres.mat");

describe("Test MATLAB parser", () => {
    it("should parse an existing MATLAB file", () => {
        new MatFile(sampleFile, (e) => {
            console.log("Event: "+JSON.stringify(e));
        });
        //let emitter: NodeJS.EventEmitter = matlabParser(sampleFile);
    })
})