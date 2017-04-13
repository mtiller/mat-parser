import path = require('path');

export type Tally = { [key: string]: number };

export function sampleFile(name: string) {
    if (process.env["NODE_ENV"] == "testing") {
        return path.join(__dirname, "..", "..", "samples", name);
    } else {
        return path.join(__dirname, "..", "samples", name);
    }
}

export const initialCounts: Tally = {
    "matrix": 0,
    "column": 0,
    "end": 0,
    "eof": 0,
    "error": 0,
}

export type TrajectoryResult = { [key: string]: number };
export type FinalResult = { [key: string]: number };

export type Signals = { [filename: string]: { trajs: TrajectoryResult, finals: FinalResult }}

export const signals: Signals = {
    "Comparison.mat": {
        trajs: {
            "Time": 543,
            "nr_nl.I1.phi": 543,
        },
        finals: {
            "Time": 1,
            "nr_nl.I1.der(phi)": 0.017469031736254692,
        },
    },
    "drvres.mat": {
        trajs: {
            "Time": 580,
            "atmosphere.T": 1,
        },
        finals: {
            "Time": 50,
            "atmosphere.p": 100000,
        },
    }
}
export const counts = {
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

export const files = Object.keys(counts);