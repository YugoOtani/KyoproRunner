import * as vscode from "vscode";
import { EXTENSION_NAME } from "./extension";

export class TerminalWrapper {
  private current: vscode.Terminal | null;
  public constructor() {
    this.current = null;
  }
  public sendTexts(input: string[]) {
    if (!this.current){
        this.current = findTerminal();
    }
    if (!this.current){
        this.current = createTerminal();
    }
    this.current?.show();
    for (const s of input){
        this.current?.sendText(s);
    }
    
  }
}
function findTerminal(){
    const t = vscode.window.terminals.find(term=>term.name === EXTENSION_NAME);
    if (t){
        return t;
    }else{
        return null;
    }
}
function createTerminal(){
    const path = workspacePath();
    if (path) {
      return vscode.window.createTerminal({
        name: EXTENSION_NAME,
        cwd: path,
      });
    } else {
      return vscode.window.createTerminal({
        name: EXTENSION_NAME,
      });
    }
}

function workspacePath() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return null;
  }
  return workspaceFolders[0].uri.fsPath;
}

export function addFunctionCallToMain(fileContent: string, functionName: string): string {
  const mainRegex = /fn\s+main\s*\(\s*\)\s*{([\s\S]*?)}/;
  const match = mainRegex.exec(fileContent);

  if (match) {
    const mainContent = match[1];
    const updatedMainContent = `${mainContent.trim()}\n    ${functionName}();`;
    return fileContent.replace(mainRegex, `fn main() {\n${updatedMainContent}\n}`);
  } else {
    // If there's no main function, add one
    return `${fileContent}\n\nfn main() {\n    ${functionName}();\n}`;
  }
}