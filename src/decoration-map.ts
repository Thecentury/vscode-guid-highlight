"use strict";
import * as vscode from "vscode";
import { getColorContrast } from "./dynamic-contrast";
import { HighlightMarkerType } from "./config";

export class DecorationOptions {
  markRuler: boolean;
  markerType: HighlightMarkerType;

  constructor(markRuler: boolean, markerType: HighlightMarkerType) {
    this.markRuler = markRuler;
    this.markerType = markerType;
  }
}

export class DecorationMap {
  private _map: Map<string, vscode.TextEditorDecorationType>;
  private _keys: string[];
  private options: DecorationOptions;

  constructor(options: DecorationOptions) {
    this.options = Object.assign({}, options);
    this._map = new Map();
    this._keys = [];
  }

  /**
   * @param {string} color
   * @returns vscode.TextEditorDecorationType
   */
  get(color: string): vscode.TextEditorDecorationType {
    if (!this._map.has(color)) {
      let rules: vscode.DecorationRenderOptions = {};
      if (this.options.markRuler) {
        rules.overviewRulerColor = color;
      }

      switch (this.options.markerType) {
        case HighlightMarkerType.Outline:
          rules.border = `3px solid ${color}`;
          break;
        case HighlightMarkerType.Foreground:
          rules.color = color;
          break;
        case HighlightMarkerType.Underline:
          rules.color = "invalid; border-bottom:solid 2px " + color;
          break;
        case HighlightMarkerType.DotAfter:
          rules.after = {
            contentText: " ",
            margin: "0.1em 0.2em 0 0.2em",
            width: "0.7em",
            height: "0.7em",
            backgroundColor: color,
            // borderRadius: '50%'
          };
          break;
        case HighlightMarkerType.DotBefore:
          rules.before = {
            contentText: " ",
            margin: "0.1em 0.2em 0 0.2em",
            width: "0.7em",
            height: "0.7em",
            backgroundColor: color,
            // borderRadius: '50%'
          };
          break;
        case HighlightMarkerType.Background:
        default:
          rules.backgroundColor = color;
          rules.color = getColorContrast(color);
          rules.border = `3px solid ${color}`;
          rules.borderRadius = "3px";
      }
      this._map.set(color, vscode.window.createTextEditorDecorationType(rules));
      this._keys.push(color);
    }
    return this._map.get(color)!;
  }

  keys() {
    return this._keys.slice();
  }

  dispose() {
    this._map.forEach((decoration) => {
      decoration.dispose();
    });
  }
}
