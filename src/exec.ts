import * as vscode from "vscode";
import { EXTENSION_NAME } from "./extension";

export class TerminalWrapper {
  private current: vscode.Terminal | null;
  private constructor() {
    this.current = null;
  }
  public static create(): TerminalWrapper | null {
    let term = new TerminalWrapper();
    let path = workspacePath();
    if (path) {
      term.current = vscode.window.createTerminal({
        name: EXTENSION_NAME,
        cwd: path,
      });
    } else {
      term.current = vscode.window.createTerminal({
        name: EXTENSION_NAME,
      });
    }
    return term;
  }
  public sendText(input: string) {
    const term = this.current;
    this.current?.show();
    term?.sendText(input);
  }
}

function workspacePath() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return null;
  }
  return workspaceFolders[0].uri.fsPath;
}