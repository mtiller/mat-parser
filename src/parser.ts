import fs = require('fs');
import { DataFormat, readOne, dataSize } from './dataformats';
import { Handler } from './events';

export enum MatrixType {
    FullNumeric,
    SparseNumeric,
    Text,
}

export interface Header {
    data: DataFormat;
    matrix: MatrixType;
    rows: number;
    cols: number;
    imaginary: boolean;
    namelen: number;
}

export enum Expecting {
    Header,
    Name,
    Row,
    Nothing, // Closed, Error
}

export class MatFile {
    private rem: Buffer;
    private stream: fs.ReadStream;
    private expecting: Expecting;
    private header: Header | null;
    private colnum: number | null;
    private name: string | null;
    constructor(filename: string, private handler: Handler) {
        this.rem = Buffer.alloc(0);
        this.expecting = Expecting.Header;
        this.header = null;
        this.colnum = null;
        this.stream = fs.createReadStream(filename, {
            // autoClose?
        });
        this.stream.on('data', (chunk: Buffer) => {
            this.rem = Buffer.concat([this.rem, chunk]);
            try {
                while (this.processBuffer());
            } catch (e) {
                this.sendError(e);
            }
        });
        this.stream.on('error', (err: Error) => {
            console.error(err);
            this.sendError(err);
        });
        this.stream.on('end', () => {
            try {
                while (this.processBuffer());
            } catch (e) {
                this.sendError(e);
            }
        });
        this.stream.resume();
    }
    private sendError(err: Error) {
        this.handler({ type: "error", err: err });
        this.expecting = Expecting.Nothing;
        this.stream.close();
    }
    private dataType(n: string): DataFormat {
        if (n == "0") return DataFormat.Float64;
        if (n == "1") return DataFormat.Float32;
        if (n == "2") return DataFormat.Int32;
        if (n == "3") return DataFormat.Int16;
        if (n == "4") return DataFormat.UInt16;
        if (n == "5") return DataFormat.UInt8;
        throw new Error("Invalid data type '" + n + "'");
    }
    private matrixType(n: string): MatrixType {
        if (n == "0") return MatrixType.FullNumeric;
        if (n == "1") return MatrixType.Text;
        if (n == "2") return MatrixType.SparseNumeric;
        throw new Error("Invalid matrix type '" + n + "'");
    }
    /**
     * This method returns false if it cannot process anything else.
     */
    processBuffer(): boolean {
        let size = this.rem.length;
        switch (this.expecting) {
            case Expecting.Header:
                if (size < 20) return false;
                let type = this.rem.readInt16LE(0);
                let rows = this.rem.readInt16LE(4);
                let cols = this.rem.readInt16LE(8);
                let imaginary = this.rem.readInt16BE(12);
                let namelen = this.rem.readInt16LE(16);

                let dec = type.toString();
                while (dec.length < 4) {
                    dec = "0" + dec;
                }

                let M = dec[0];
                let O = dec[1];
                let P = dec[2];
                let T = dec[3];

                if (M != "0") {
                    throw new Error("Only big-endian architectures are currently supported");
                }

                if (O != "0") {
                    throw new Error("Expected O to be zero, but it was " + O);
                }

                this.header = {
                    data: this.dataType(P),
                    matrix: this.matrixType(T),
                    rows: rows,
                    cols: cols,
                    imaginary: imaginary > 0,
                    namelen: namelen,
                }

                this.rem = this.rem.slice(16);
                this.expecting = Expecting.Name;
                return true;
            case Expecting.Name:
                if (this.header == null) throw new Error("Reading name, but no header found...this should not happen");
                if (size < this.header.namelen) return false;
                let name = this.rem.slice(0, this.header.namelen).toString("ascii");
                try {
                    this.handler({ type: "matrix", name: name });
                } catch (e) {
                    console.error("Ignoring error in handling matrix event: ", e);
                }
                this.rem = this.rem.slice(this.header.namelen);
                this.colnum = 0;
                this.name = name;
                this.expecting = Expecting.Row;
                return true;
            case Expecting.Row:
                if (this.header == null) throw new Error("Reading name, but no header found. This should not happen");
                if (this.colnum == null) throw new Error("Expected column number to be set, but was null. This should not happen");
                if (this.name == null) throw new Error("Expected matrix to be named, but found null. This should not happen");
                if (size < dataSize(this.header.data, this.header.rows)) return false;
                let col: any[] = [];
                for(let i=0;i<this.header.rows;i++) {
                    this.rem = readOne(col, this.header.data, this.rem);
                }
                try {
                    this.handler({ type: "column", name: this.name, colnum: this.colnum, column: col });
                } catch (e) {
                    console.error("Ignore error in handling column event: ", e);
                }
                this.colnum++;
                if (this.colnum==this.header.cols) {
                    this.header = null;
                    this.colnum = null;
                    this.handler({ type: "end", name: this.name });
                    this.name = null;
                    this.expecting = Expecting.Header;
                }
                return true;
            default:
                throw new Error("Unexpected state: "+this.expecting);
        }
    }
}
