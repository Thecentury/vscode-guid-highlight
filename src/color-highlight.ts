import { workspace, window, Range, TextDocument, Disposable } from "vscode";

import { DecorationMap, DecorationOptions } from "./decoration-map";
import { HighlightedRange } from "./strategies/strategy-types";
import { pattern } from "./strategies/pattern";

function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern, "dgi");
    return true;
  } catch (error) {
    return false;
  }
}

export class DocumentHighlight {
  disposed: boolean;
  document: TextDocument;
  decorations: DecorationMap;
  listener: Disposable;
  patterns: string[];

  constructor(document: TextDocument, viewConfig: DecorationOptions, patterns: string[]) {
    this.disposed = false;
    this.document = document;
    // todo log invalid patterns
    this.patterns = patterns.filter((pattern) => pattern.length > 0 && !pattern.startsWith("# ") && isValidRegex(pattern));
    this.decorations = new DecorationMap(viewConfig);
    this.listener = workspace.onDidChangeTextDocument(({ document }) => this.onUpdate(document));
  }

  onUpdate(document: TextDocument = this.document) {
    if (this.disposed || this.document.uri.toString() !== document.uri.toString()) {
      return;
    }

    const text = this.document.getText();
    const version = this.document.version.toString();

    console.log(`DocumentHighlight.onUpdate: ${document.fileName} v${version}`);

    return this.updateRange(text, version);
  }

  async updateRange(text: string, version: string) {
    try {
      if (this.disposed) {
        return false;
      }

      const result = await Promise.all(this.patterns.map(regex => pattern(regex, text)));

      const actualVersion = this.document.version.toString();
      if (actualVersion !== version) {
        if (process.env.GUID_HIGHLIGHT_DEBUG) {
          throw new Error("Document version already has changed");
        }

        return;
      }

      const colorRanges = groupByColor(concatAll(result));

      if (this.disposed) {
        return false;
      }

      const updateStack = this.decorations.keys().reduce((state: Map<string, Range[]>, color: string) => {
        state.set(color, []);
        return state;
      }, new Map());

      for (let [color, ranges] of colorRanges) {
        updateStack.set(
          color,
          ranges.map((item: HighlightedRange) => {
            return new Range(this.document.positionAt(item.start), this.document.positionAt(item.end));
          })
        );
      }

      const documentEditors = window.visibleTextEditors.filter(({ document }) => document.uri === this.document.uri);
      for (let [color, updates] of updateStack) {
        const decoration = this.decorations.get(color);

        documentEditors
          .forEach((editor) => editor.setDecorations(decoration, updates));
      }
    } catch (error) {
      console.error(error);
    }
  }

  dispose() {
    this.disposed = true;
    this.decorations.dispose();
    this.listener.dispose();
  }
}

function groupByColor(results: HighlightedRange[]): Map<string, HighlightedRange[]> {
  return results.reduce((collection: Map<string, HighlightedRange[]>, item: HighlightedRange) => {
    let list = collection.get(item.color);
    if (!list) {
      list = [];
      collection.set(item.color, list);
    }

    list.push(item);

    return collection;
  }, new Map());
}

function concatAll(arr: any[]) {
  return arr.reduce((result, item) => result.concat(item), []);
}
