import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
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
}

export function deactivate() {

}
