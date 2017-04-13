export enum DataFormat {
    Float64,
    Float32,
    Int32,
    Int16,
    UInt16,
    UInt8,
}

export function dataSize(format: DataFormat, n: number) {
    switch (format) {
        case DataFormat.Float64:
            return 8 * n;
        case DataFormat.Float32:
            return 4 * n;
        case DataFormat.Int32:
            return 4 * n;
        case DataFormat.Int16:
            return 2 * n;
        case DataFormat.UInt16:
            return 2 * n;
        case DataFormat.UInt8:
            return 1 * n;
        default:
            throw new Error("Unknown data format: " + format);
    }
}

export function readOne(info: Array<any>, format: DataFormat, buffer: Buffer): Buffer {
    switch (format) {
        case DataFormat.Float64:
            info.push(buffer.readDoubleLE(0));
            break;
        case DataFormat.Float32:
            info.push(buffer.readFloatLE(0));
            break;
        case DataFormat.Int32:
            info.push(buffer.readInt32LE(0));
            break;
        case DataFormat.Int16:
            info.push(buffer.readInt16LE(0));
            break;
        case DataFormat.UInt16:
            info.push(buffer.readUInt16LE(0));
            break;
        case DataFormat.UInt8:
            info.push(buffer.readUInt8(0));
            break;
        default:
            throw new Error("Uknown DataFormat value: " + format);
    }
    return buffer.slice(dataSize(format, 1));
}

export enum MatrixType {
    FullNumeric,
    SparseNumeric,
    Text,
}
