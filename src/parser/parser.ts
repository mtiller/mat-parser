import { Observable } from 'rxjs';
import { DataFormat, readOne, dataSize, MatrixType, matrixType, dataType } from './types';
import { Handler } from './handler';

interface Header {
    data: DataFormat;
    matrix: MatrixType;
    rows: number;
    cols: number;
    imaginary: boolean;
    namelen: number;
}

enum Expecting {
    Header,
    Name,
    Row,
    Nothing, // Closed, Error
}

interface ParserState {
    rem: Buffer;
    expecting: Expecting;
    header: Header | null;
    colnum: number | null;
    name: string | null;
}

/**
 * This class takes data from an Observer that passes a sequence of buffer corresponding to the
 * bytes in a MATLAB v4 file.  This class parses that binary data and fires calls to a Handler
 * class that can then do with that information what it wishes.
 * 
 * The format is documented here:
 * 
 * https://www.mathworks.com/help/pdf_doc/matlab/matfile_format.pdf
 */
export class MatFile {
    private state: ParserState;
    constructor(protected source: Observable<Buffer>) {
        this.resetState();
    }
    private resetState() {
        this.state = {
            rem: Buffer.alloc(0),
            expecting: Expecting.Header,
            header: null,
            colnum: null,
            name: null,
        }
    }
    parse(handler: Handler): Promise<void> {
        this.resetState();
        return new Promise<void>((resolve, reject) => {
            let sub = this.source.subscribe((chunk) => {
                this.state.rem = Buffer.concat([this.state.rem, chunk]);
                try {
                    while (this.processBuffer(handler));
                } catch (e) {
                    console.error("Error processing buffer: ", e);
                    sub.unsubscribe();
                    reject(e);
                }
            }, (err: Error) => {
                reject(err);
            }, () => {
                if (this.state.rem.length == 0) {
                    handler.eof();
                    resolve(undefined);
                }
                else reject(new Error("Ran out of data prematurely"));
            })
        })
    }
    /**
     * This method returns false if it cannot process anything else.
     */
    processBuffer(handler: Handler): boolean {
        let size = this.state.rem.length;
        switch (this.state.expecting) {
            case Expecting.Header:
                if (size < 20) return false;
                let type = this.state.rem.readInt32LE(0);
                let rows = this.state.rem.readInt32LE(4);
                let cols = this.state.rem.readInt32LE(8);
                let imaginary = this.state.rem.readInt32BE(12);
                let namelen = this.state.rem.readInt32LE(16);

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

                this.state.header = {
                    data: dataType(P),
                    matrix: matrixType(T),
                    rows: rows,
                    cols: cols,
                    imaginary: imaginary > 0,
                    namelen: namelen,
                }

                this.state.rem = this.state.rem.slice(20);
                this.state.expecting = Expecting.Name;
                return true;
            case Expecting.Name:
                if (this.state.header == null) {
                    throw new Error("Reading name, but no header found...this should not happen");
                }
                if (size < this.state.header.namelen) return false;
                let name = this.state.rem.slice(0, this.state.header.namelen - 1).toString("ascii");
                console.log("Header for '" + name + "' = " + JSON.stringify(this.state.header));
                try {
                    if (handler) {
                        handler.start(name, this.state.header.rows, this.state.header.cols);
                    }
                } catch (e) {
                    console.error("Ignoring error in handling matrix event: ", e);
                }
                this.state.rem = this.state.rem.slice(this.state.header.namelen);
                this.state.colnum = 0;
                this.state.name = name;
                this.state.expecting = Expecting.Row;
                return true;
            case Expecting.Row:
                if (this.state.header == null) throw new Error("Reading name, but no header found. This should not happen");
                if (this.state.colnum == null) throw new Error("Expected column number to be set, but was null. This should not happen");
                if (this.state.name == null) throw new Error("Expected matrix to be named, but found null. This should not happen");
                if (size < dataSize(this.state.header.data, this.state.header.rows)) return false;

                let col: any[] = [];
                for (let i = 0; i < this.state.header.rows; i++) {
                    this.state.rem = readOne(col, this.state.header.data, this.state.rem);
                }
                try {
                    if (handler) {
                        handler.column(this.state.name, this.state.colnum, this.state.header.matrix,
                            col, this.state.colnum == this.state.header.cols - 1);
                    }
                } catch (e) {
                    console.error("Ignore error in handling column event: ", e);
                }
                this.state.colnum++;
                if (this.state.colnum == this.state.header.cols) {
                    let stop: boolean = false;
                    if (handler) {
                        stop = handler.end(this.state.name);
                    }
                    this.state.header = null;
                    this.state.colnum = null;
                    this.state.name = null;
                    if (stop) {
                        this.state.expecting = Expecting.Nothing;
                    } else {
                        this.state.expecting = Expecting.Header;
                    }
                }
                return true;
            case Expecting.Nothing:
                this.state.name = null;
                this.state.rem = new Buffer([]);
                return false;
            default:
                throw new Error("Unexpected state: " + this.state.expecting);
        }
    }
}
