export enum HighlightMarkerType {
    Outline = "outline",
    Foreground = "foreground",
    Background = "background",
    Underline = "underline",
    DotAfter = "dot-after",
    DotBefore = "dot-before",
}

export interface GuidHighlightConfig {
    enable: boolean;
    languages: string[];
    markerType: HighlightMarkerType;
    markRuler: boolean;
    patterns: string[];
    maxFileSize: number;
}