export class HighlightedRange {
    start: number;
    end: number;
    color: string;
    constructor(start: number, end: number, color: string) {
        this.start = start;
        this.end = end;
        this.color = color;
    }
}