export interface MatrixEvent {
    type: "matrix";
    name: string;
}

export interface ColumnEvent {
    type: "column";
    colnum: number;
    name: string;
    column: Array<any>;
}

export interface EndEvent {
    type: "end";
    name: string;
}

export interface ErrorEvent {
    type: "error";
    err: Error;
}

export type Event = MatrixEvent | ColumnEvent | ErrorEvent | EndEvent;

/**
 * A Handler should return true if it wants to continue;
 */
export type Handler = (e: Event) => void;
