import { MatrixType } from './types';

export interface MatrixStartEvent {
    type: "matrix";
    name: string;
}

export interface ColumnEvent {
    type: "column";
    colnum: number;
    name: string;
    format: MatrixType;
    column: Array<any>;
}

export interface MatrixEndEvent {
    type: "end";
    name: string;
}

export interface EndOfFileEvent {
    type: "eof";
}

export interface ErrorEvent {
    type: "error";
    err: Error;
}

export type Event = MatrixStartEvent | ColumnEvent | ErrorEvent | MatrixEndEvent | EndOfFileEvent;

/**
 * A Handler should return true if it wants to continue;
 */
export type Handler = (e: Event) => void;
