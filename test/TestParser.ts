import { expect } from 'chai';
import path = require('path');

const sampleFile = path.join(__dirname, "..", "samples", "drvres.mat");

describe("Test MATLAB parser", () => {
    it("should parse the header from a sample file", () => {
        //let emitter: NodeJS.EventEmitter = matlabParser(sampleFile);
    })
})