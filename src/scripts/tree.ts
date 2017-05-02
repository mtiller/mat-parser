import { blobReader } from '../readers';
import { MatFile } from '../parser';
import { DymolaResultsExtractor } from '../dsres';
import yargs = require('yargs');

let opts = yargs

let args = opts.argv;

if (args._.length != 1) {
    console.error("Usage: " + args["$0"] + " [options] file");
    process.exit(1);
}

async function run() {
    let filename = args._[0];

    let obs = blobReader(filename);
    let file = new MatFile(obs);
    let handler = new DymolaResultsExtractor(() => true, () => false);
    await file.parse(handler);
    let signals = Object.keys(handler.trajectories);
    console.log("Signals: ");
    signals.forEach((signal) => console.log(signal));
}

run().catch((e) => console.error(e));
