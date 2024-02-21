import { workspace, window, Range, TextDocument, Disposable } from "vscode";

import { DecorationMap, DecorationOptions } from "./decoration-map";
import { HighlightedRange } from "./strategies/strategy-types";
import { dotnetGuids } from "./strategies/dotnet-guid";

export class DocumentHighlight {
  disposed: boolean;
  document: TextDocument;
  strategies: ((text: string) => Promise<HighlightedRange[]>)[];
  decorations: DecorationMap;
  listener: Disposable;

  constructor(document: TextDocument, viewConfig: DecorationOptions) {
    this.disposed = false;
    this.document = document;
    this.strategies = [dotnetGuids];
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

  /**
   * @param {string} text
   * @param {string} version
   *
   * @memberOf DocumentHighlight
   */
  async updateRange(text: string, version: string) {
    try {
      const result = await Promise.all(this.strategies.map((fn) => fn(text)));

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
