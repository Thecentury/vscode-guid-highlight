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
    // todo initialize strategies
    this.strategies = [dotnetGuids];
    //   this.strategies = [findFn, findHwb];

    //   if (viewConfig.useARGB == true) {
    //     this.strategies.push(findHexARGB);
    //   } else {
    //     this.strategies.push(findHexRGBA);
    //   }

    //   if (colorWordsLanguages.indexOf(document.languageId) > -1 || viewConfig.matchWords) {
    //     this.strategies.push(findWords);
    //   }

    //   if (viewConfig.matchRgbWithNoFunction) {
    //     let isValid = false;

    //     if (viewConfig.rgbWithNoFunctionLanguages.indexOf('*') > -1) {
    //       isValid = true;
    //     }

    //     if (viewConfig.rgbWithNoFunctionLanguages.indexOf(document.languageId) > -1) {
    //       isValid = true;
    //     }

    //     if (viewConfig.rgbWithNoFunctionLanguages.indexOf(`!${document.languageId}`) > -1) {
    //       isValid = false;
    //     }

    //     if (isValid) this.strategies.push(findRgbNoFn);
    //   }

    //   switch (document.languageId) {
    //     case 'css':
    //       this.strategies.push(findCssVars);
    //       break;
    //     case 'less':
    //       this.strategies.push(findLessVars);
    //       break;
    //     case 'stylus':
    //       this.strategies.push(findStylVars);
    //       break;
    //     case 'sass':
    //     case 'scss':
    //       this.strategies.push(text => findScssVars(text, {
    //         data: text,
    //         cwd: dirname(document.uri.fsPath),
    //         extensions: ['.scss', '.sass'],
    //         includePaths: viewConfig.sass.includePaths || []
    //       }));
    //       break;
    //   }

    this.decorations = new DecorationMap(viewConfig);
    this.listener = workspace.onDidChangeTextDocument(({ document }) =>
      this.onUpdate(document)
    );
  }

  onUpdate(document: TextDocument = this.document) {
    if (
      this.disposed ||
      this.document.uri.toString() !== document.uri.toString()
    ) {
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
        // todo update env
        if (process.env.COLOR_HIGHLIGHT_DEBUG)
          throw new Error("Document version already has changed");

        return;
      }

      const colorRanges = groupByColor(concatAll(result));

      if (this.disposed) {
        return false;
      }

      const updateStack = this.decorations
        .keys()
        .reduce((state: Map<string, Range[]>, color: string) => {
          state.set(color, []);
          return state;
        }, new Map());

      for (let [color, ranges] of colorRanges) {
        updateStack.set(
          color,
          ranges.map((item: HighlightedRange) => {
            return new Range(
              this.document.positionAt(item.start),
              this.document.positionAt(item.end)
            );
          })
        );
      }

      for (let [color, updates] of updateStack) {
        const decoration = this.decorations.get(color);

        window.visibleTextEditors
          .filter(({ document }) => document.uri === this.document.uri)
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

    //   this.decorations = null;
    //   this.document = null;
    //   this.colors = null;
    //   this.listener = null;
  }
}

function groupByColor(
  results: HighlightedRange[]
): Map<string, HighlightedRange[]> {
  return results.reduce(
    (collection: Map<string, HighlightedRange[]>, item: HighlightedRange) => {
      let list = collection.get(item.color);
      if (!list) {
        list = [];
        collection.set(item.color, list);
      }

      list.push(item);

      return collection;
    },
    new Map()
  );
}

function concatAll(arr: any[]) {
  return arr.reduce((result, item) => result.concat(item), []);
}
