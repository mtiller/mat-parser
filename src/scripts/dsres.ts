import { blobReader } from '../readers';
import { MatFile } from '../parser';
import { DymolaResultsExtractor } from '../dsres';
import yargs = require('yargs');
import fs = require('fs');

let opts = yargs
    .default("final", [], "Variables to get the final value for")
    .default("signal", [], "Variables to get the continuous signal for")
    .default("root", [], "Variables that start at this part")
    .default("outfile", null, "Output file")
    .default("pretty", true, "Pretty output")
    .default("stats", false, "Statistics")
    .default("parts", false, "Include all data for 3D parts")
    .alias("f", "final")
    .alias("s", "signal")
    .alias("r", "root")
    .alias("o", "outfile")
    .alias("p", "pretty")
    .alias("d", "parts")

let args = opts.argv;

if (args._.length != 1) {
    console.error("Usage: " + args["$0"] + " [options] file");
    process.exit(1);
}

if (!Array.isArray(args.final)) args.final = [args.final];
if (!Array.isArray(args.signal)) args.signal = [args.signal];
if (!Array.isArray(args.root)) args.root = [args.root];

export function partOrSignal(signals: string[], root: string[]) {
    return (name: string) => {
        if (signals.indexOf("*") >= 0) return true;
        if (signals.indexOf(name) >= 0) return true;
        if (root.some((n) => name.startsWith(n + "."))) {
            return true;
        }
        return false;
    }
}

function matchsNames(names: string[]) {
    return (name: string) => {
        return names.indexOf("*") >= 0 || names.indexOf(name) >= 0;
    }
}

async function run() {
    let filename = args._[0];

    let signals = [...args.signal];
    let roots = [...args.root];
    let stats = args.stats;
    console.log("root = ", roots);

    let obs = blobReader(filename);
    let file = new MatFile(obs);
    let handler = new DymolaResultsExtractor(partOrSignal(signals, roots), matchsNames(args.final));
    await file.parse(handler);
    let result = {
        trajectories: handler.trajectories,
        final: handler.finals,
    }

    if (stats) {
        console.log("Signals: ");
        Object.keys(result.trajectories).forEach((key) => {
            let val = result.trajectories[key];
            if (Array.isArray(val)) {
                console.log("  " + key + " = ", val[0] + " .. " + val[val.length - 1]);
            } else {
                console.log("  " + key + " = ", val);
            }
        })
        console.log("Final Values: ");
        Object.keys(result.final).forEach((key) => {
            let val = result.final[key];
            console.log("  " + key + " = " + val);
        })
    }
    if (args.outfile) {
        if (args.pretty) {
            fs.writeFileSync(args.outfile, JSON.stringify(result, null, 4));
        } else {
            fs.writeFileSync(args.outfile, JSON.stringify(result));
        }
    } else {
        if (args.pretty) {
            console.log(JSON.stringify(result, null, 4));
        } else {
            console.log(JSON.stringify(result));
        }
    }
    return result;
}

run().catch((e) => console.error(e));
