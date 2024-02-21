import { HighlightedRange } from "./strategy-types";
import { knownColors } from "../colors";

function guidToColor(guid: string): string {
  guid = guid.replace(/-/g, "");
  let groups: string[] = [];
  for (let i = 0; i < guid.length; i += 8) {
    groups.push(guid.slice(i, i + 8));
  }
  const hash = groups.map((group) => parseInt(group, 16)).reduce((acc, val) => acc ^ val, 0);
  const color = knownColors[Math.abs(hash) % knownColors.length];
  return color;
}

export async function dotnetGuids(text: string): Promise<HighlightedRange[]> {
  // d — enable regex indices
  // g — global search
  // i — ignore case
  const guidRegex = /\b[\dA-F]{8}-[\dA-F]{4}-[\dA-F]{4}-[\dA-F]{4}-[\dA-F]{12}\b/dgi;
  const ranges: HighlightedRange[] = [];
  while (true) {
    const matches = guidRegex.exec(text);
    if (matches) {
      const indices = matches.indices![0];
      ranges.push(new HighlightedRange(indices[0], indices[1], guidToColor(matches[0])));
    } else {
      return ranges;
    }
  }
}
