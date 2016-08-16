'use strict';

import * as vscode from 'vscode';

export default class StylishHaskellProvider implements vscode.CodeActionProvider {
	private diagnosticCollection: vscode.DiagnosticCollection;
	private regex: RegExp;

	public activate(subscriptions: vscode.Disposable[]): void {
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection();
		this.regex = new RegExp('\\(SrcLoc ".+" (\\d+) (\\d+)\\) "(.+)"');
	}

	public dispose(): void {
		this.diagnosticCollection.clear();
		this.diagnosticCollection.dispose();
	}

	public processOutput(file: vscode.Uri, output: String): void {
		// Example output:
		// Language.Haskell.Stylish.Parse.parseModule: could not parse /Users/vigoo/GitHub/private/bari/tmp/Test.hs: ParseFailed (SrcLoc "<unknown>.hs" 3 1) "Parse error: main"

		var result = this.regex.exec(output);
		if (result != null) {
			var line = parseInt(result[1]) - 1;
			var column = parseInt(result[2]) - 1;
			var message = result[3];

			console.log(`Found error at line ${line}, column ${column}: ${message}`);
			this.diagnosticCollection.set(file, [
				new vscode.Diagnostic(
					new vscode.Range(line, column, line, column), message)
				]);
		}
	}

	public reset(): void {
		this.diagnosticCollection.clear();
	}
}