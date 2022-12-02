import * as vscode from 'vscode'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { commands, window, workspace } from 'vscode'
import { readFileSync, promises as fsPromises } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

export const TEST_MENTION = 'update_mention';
const open = '[';
const close = ']';


export enum CommandKeys {
  synth = 'extension.tsl-vscode.synth',
}

export const synthOptions = [
  'js',
  'arrow',
  'clash',
  'xstate',
  'python',
  'monadic',
  'webaudio',
  'applicative',
]

export function activate(context: vscode.ExtensionContext) {
  commands.registerCommand(CommandKeys.synth, () => {
    const editor = window.activeTextEditor
    if (!editor) {
      window.showInformationMessage('No active editor')
      return
    }
    const fileName = editor?.document.fileName

    if (!(editor.document.fileName.endsWith('.tsl')))
      window.showInformationMessage('Current file is not a TSL file')

    window.showQuickPick(synthOptions).then((option) => {
      if (option) {
        const root = workspace.getWorkspaceFolder(editor.document.uri)
        if (!root){
          return
        }
        const out = path.join(root?.uri.fsPath, 'out')
        if (!existsSync(out))
          mkdirSync(out)

        const tslSpec = readFileSync(`${fileName}`, `utf-8`);
        fetch(`https://graphviz-web-vvxsiayuzq-ue.a.run.app/tslsynth?tsl=`+tslSpec+`&target=`+option)
          .then(response => {
            response.text().then(function(text) {
              writeFileSync(path.join(
                out, `${path.basename(fileName, "tsl")}${option}`,
              ), text)
            })
          })
          .catch(error => console.error(error));
      }
    })
  })

  const vscode = require('vscode')
  
  //diagnostics
  const testDiagnostics = vscode.languages.createDiagnosticCollection("test")
  context.subscriptions.push(testDiagnostics)
  subscribeToDocumentChanges(context, testDiagnostics);

  //hover for operator info
  vscode.languages.registerHoverProvider('tsl', {
    provideHover(document, position, token) {

        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);
        
        if (word == "G") {
            return new vscode.Hover({
                language: "tsl",
                value: "operator: always \nusage: G formula"
            });
        }
        else if (word == "F") {
          return new vscode.Hover({
            language: "tsl",
            value: "operator: eventually \nusage: F formula"
        });
        }
        else if (word == "U") {
          return new vscode.Hover({
            language: "tsl",
            value: "operator: until \nusage: formula U formula"
        });
        }
        else if (word == "X") {
          return new vscode.Hover({
            language: "tsl",
            value: "operator: next \nusage: X formula"
        });
        }
        else if (word == "->") {
          return new vscode.Hover({
            language: "tsl",
            value: "operator: implies \nusage: formula -> formula"
        });
        }
        else if (word == "<->") {
          return new vscode.Hover({
            language: "tsl",
            value: "operator: iff \nusage: formula <-> formula"
        });
        }
        else if (word == "&&") {
          return new vscode.Hover({
            language: "tsl",
            value: "operator: and \nusage: formula && formula"
        });
        }
        else if (word == "||") {
          return new vscode.Hover({
            language: "tsl",
            value: "operator: or \nusage: formula || formula"
        });
        }
        else if (word == "!") {
          return new vscode.Hover({
            language: "tsl",
            value: "operator: not \nusage: ! formula"
        });
        }
        else if (word == "<-") {
          return new vscode.Hover({
            language: "tsl",
            value: "formula: update \nusage: [outSignal <- fxnTerm] || [outSignal <- inSignal]"
        });
        }
        else if (word == 'assume'){
          return new vscode.Hover({
            language: "tsl",
            value: "assume block\nassumptions about the environment"
          })
        }
        else if (word == 'guarantee'){
          return new vscode.Hover({
            language: 'tsl',
            value: "guarantee block\nspecifications of the system"
          })
        }
    }
});
}

//diagnostic functions
export function subscribeToDocumentChanges(context: vscode.ExtensionContext, testDiagnostics: vscode.DiagnosticCollection): void {
	if (vscode.window.activeTextEditor) {
		refreshDiagnostics(vscode.window.activeTextEditor.document, testDiagnostics);
	}
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				refreshDiagnostics(editor.document, testDiagnostics);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, testDiagnostics))
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(doc => testDiagnostics.delete(doc.uri))
	);

}

export function refreshDiagnostics(doc: vscode.TextDocument, testDiagnostics: vscode.DiagnosticCollection): void {
	const diagnostics: vscode.Diagnostic[] = [];

	for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
		const lineOfText = doc.lineAt(lineIndex);
    if (lineOfText.text.includes('assume')){
      for(let newLine = lineIndex; newLine < doc.lineCount; newLine++){
        const newLineText = doc.lineAt(newLine);
        if(newLineText.text.includes('->')){
          if (newLineText.text.includes(open) && newLineText.text.includes(close)) {
            diagnostics.push(createDiagnostic(doc, newLineText, newLine));
          }
          else if(newLineText.text.includes("guarantee")){
            break;
          }
        }
        else if(newLineText.text.includes("guarantee")){
          break;
        }
      }
    }
    else{break}
  }
	testDiagnostics.set(doc.uri, diagnostics);
}

function createDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number): vscode.Diagnostic {
	// find where in the line of thet the 'emoji' is mentioned
	const start = lineOfText.text.indexOf(open);
  const end = lineOfText.text.indexOf(close);

	// create range that represents, where in the document the word is
	const range = new vscode.Range(lineIndex, start, lineIndex, end);

	const diagnostic = new vscode.Diagnostic(range, "Updates generally don't go in the assumption block, and they never go on the right side of an implication!",
		vscode.DiagnosticSeverity.Information);
	diagnostic.code = TEST_MENTION;
	return diagnostic;
}

export function deactivate() {

}
