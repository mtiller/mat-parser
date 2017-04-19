import { blobReader } from '../readers';
import { MatFile } from '../parser';
import { DymolaResultsExtractor } from '../dsres';
import yargs = require('yargs');

let opts = yargs
    .default("final", [], "Variables to get the final value for")
    .default("signal", [], "Variables to get the continuous signal for")
    .default("outfile", null, "Output file")

let args = opts.argv;

if (args._.length != 1) {
    console.error("Usage: " + args["$0"] + " [options] file");
    process.exit(1);
}

console.log("blobReader = ", blobReader);

if (!Array.isArray(args.final)) args.final = [args.final];
if (!Array.isArray(args.signal)) args.signal = [args.signal];

console.log("args = ", args);

async function run() {
    let filename = args._[0];
    let obs = blobReader(filename);
    let file = new MatFile(obs);
    let handler = new DymolaResultsExtractor(args.signal, args.final);
    await file.parse(handler);
    let result = {
        trajectories: handler.trajectories,
        finals: handler.finals,
    }
    return result;
}

run().catch((e) => console.error(e));
