import { HighlightedRange } from "./strategy-types";

export async function dotnetGuids(text : string) : Promise<HighlightedRange[]> {
    const matches = text.match(/[\dA-F]{8}-[\dA-F]{4}-[\dA-F]{4}-[\dA-F]{4}-[\dA-F]{12}/gi);
    if (matches) {
        return matches.map(match => new HighlightedRange(
            text.indexOf(match),
            text.indexOf(match) + match.length,
            // todo construct color
            "#FFFF00"
        ));
    }
    return [];
}