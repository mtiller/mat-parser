import { Subject } from "rxjs";
import fs = require("fs");

export function chunkReader(filename: string) {
  let subj = new Subject<Buffer>();
  let stream = fs.createReadStream(filename, {});
  stream.on("data", (chunk: Buffer) => {
    subj.next(chunk);
  });
  stream.on("end", () => {
    subj.complete();
  });
  stream.on("error", (e: Error) => {
    subj.error(e);
  });
  return subj;
}
