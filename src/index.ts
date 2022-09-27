import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { isContext } from 'vm'
import { commands, window, workspace } from 'vscode'

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

export function activate() {
  commands.registerCommand(CommandKeys.synth, () => {
    const editor = window.activeTextEditor
    if (!editor) {
      window.showInformationMessage('No active editor')
      return
    }
    const fileName = editor?.document.fileName

    if (!editor.document.fileName.endsWith('.tsl'))
      window.showInformationMessage('Current file is not a TSL file')

    window.showQuickPick(synthOptions).then((option) => {
      if (option) {
        const root = workspace.getWorkspaceFolder(editor.document.uri)
        if (!root)
          return

        const out = path.join(root?.uri.fsPath, 'out')
        if (!existsSync(out))
          mkdirSync(out)

        const dir = path.dirname(fileName)
        const tslsynth = spawn(`tslsynth ${fileName} --${option}`, { cwd: dir })
        tslsynth.stdout.on('data', (data) => {
          writeFileSync(path.join(
            out, `${path.basename(fileName, '.tsl')}.${option}`,
          ), data)
        })
      }
    })
  })

  const vscode = require('vscode')

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
            value: "formula: update \nusage: [fxn <- fxnTerm] || [outSignal <- inSignal]"
        });
        }
    }
});

}

export function deactivate() {

}
