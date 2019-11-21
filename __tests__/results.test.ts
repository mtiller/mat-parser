import { files, sampleFile, signals } from "../src/testing";
import {
  blobReader,
  MatFile,
  DymolaResultsExtractor,
  DymolaSignalExtractor
} from "../src";

describe("Test Dymola results processing", () => {
  for (let i = 0; i < files.length; i++) {
    let filename = files[i];
    it("should parse signal names from '" + filename + "'", async () => {
      let fullname = sampleFile(filename);
      let obs = blobReader(fullname);
      let file = new MatFile(obs);
      let handler = new DymolaSignalExtractor();
      await file.parse(handler);
      let names = Object.keys(handler.descriptions);
      expect(names).toContain("Time");
      expect(names.length).toEqual(signals[filename].signals);
      //expect(Object.keys(handler.descriptions).length).to.be.greaterThan(0);
    });
    it("should parse results from '" + filename + "'", async () => {
      let fullname = sampleFile(filename);
      let obs = blobReader(fullname);
      let file = new MatFile(obs);
      let sig = signals[filename];
      expect(sig).not.toEqual(undefined);
      let trajs = sig.trajs;
      let finals = sig.finals;
      let handler = new DymolaResultsExtractor(
        n => Object.keys(trajs).indexOf(n) >= 0,
        n => Object.keys(finals).indexOf(n) >= 0
      );
      await file.parse(handler);
      expect(Object.keys(handler.trajectories)).toEqual(Object.keys(trajs));
      expect(Object.keys(handler.finals)).toEqual(Object.keys(finals));
      Object.keys(trajs).forEach(key => {
        let exp = trajs[key];
        let t = handler.trajectories[key];
        if (Array.isArray(t)) {
          expect(t.length).toEqual(exp);
        } else {
          expect(1).toEqual(exp);
        }
      });
      Object.keys(finals).forEach(key => {
        let exp = finals[key];
        let val = handler.finals[key];
        expect(val).not.toEqual(undefined);
        expect(val).toEqual(exp);
      });
    });
  }
});
