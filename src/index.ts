import { commands, window } from 'vscode'

export function activate() {
  commands.registerCommand('extension.helloWorld', () => {
    window.showInformationMessage('Hello World!')
  })
}

export function deactivate() {

}
