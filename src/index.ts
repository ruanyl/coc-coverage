import { Document, ExtensionContext, Uri, workspace } from 'coc.nvim';

import chokidar from 'chokidar';
import { createFileCoverage } from 'istanbul-lib-coverage';
import debounce from 'lodash.debounce';
import fs from 'fs';
import path from 'path';

const DEFAULT_REPORT_PATH = '/coverage/coverage-final.json';
const signGroup = 'CocCoverage';
const cachedReport: { json: { [key: string]: any } } = {
  json: {},
};

function updateSign(doc: Document, sign: string, signGroup: string, signPriority: number) {
  const filepath = Uri.parse(doc.uri).fsPath;
  const workspaceDir = workspace.getWorkspaceFolder(doc.uri);
  const relativeFilepath = workspaceDir ? path.relative(workspaceDir.uri, doc.uri) : '';
  const stats = cachedReport.json[filepath] || cachedReport.json[relativeFilepath];
  if (stats) {
    const fileCoverage = createFileCoverage(stats);
    const uncoveredLines = fileCoverage.getUncoveredLines();
    const summary = fileCoverage.toSummary();
    workspace.nvim.setVar('coc_coverage_branches_pct', `${summary.branches.pct}`, true);
    workspace.nvim.setVar('coc_coverage_lines_pct', `${summary.lines.pct}`, true);
    workspace.nvim.setVar('coc_coverage_functions_pct', `${summary.functions.pct}`, true);
    workspace.nvim.setVar('coc_coverage_statements_pct', `${summary.statements.pct}`, true);

    workspace.nvim.pauseNotification();
    workspace.nvim.call('sign_unplace', [signGroup, { buffer: doc.bufnr }], true);
    uncoveredLines.forEach((lnum) => {
      workspace.nvim.call('sign_place', [0, signGroup, sign, doc.bufnr, { lnum: lnum, priority: signPriority }], true);
    });
    workspace.nvim.resumeNotification(false, true);
  }
}

export async function activate(context: ExtensionContext): Promise<void> {
  const config = workspace.getConfiguration('coverage');
  const enabled = config.get<boolean>('enabled', true);
  if (!enabled) {
    return;
  }

  const signPriority = config.get<number>('signPriority', 10);
  const uncoveredSign = config.get<string>('uncoveredSign.text', '▣');
  const hlGroup = config.get<string>('uncoveredSign.hlGroup', 'UncoveredLine');
  const reportPath = config.get<string>('jsonReportPath', DEFAULT_REPORT_PATH);

  const debounceReadFile = debounce((path) => {
    const str = fs.readFileSync(path).toString();
    const json = JSON.parse(str);
    cachedReport.json = json;

    workspace.document.then((doc) => {
      updateSign(doc, 'CocCoverageUncovered', signGroup, signPriority);
    });
  }, 2000);

  function startWatch(path: string) {
    if (fs.existsSync(path)) {
      // Initial read
      debounceReadFile(path);
    }

    // Start watcher
    const watcher = chokidar.watch(path, { persistent: true });
    watcher
      .on('change', (path) => {
        debounceReadFile(path);
      })
      .on('add', (path) => {
        debounceReadFile(path);
      });
  }

  workspace.nvim.command(
    `sign define CocCoverageUncovered text=${uncoveredSign} texthl=CocCoverageUncoveredSign`,
    true
  );
  workspace.nvim.command(`hi default link CocCoverageUncoveredSign ${hlGroup}`, true);
  // workspace.nvim.command(`hi UncoveredLine guifg=#ffaa00`, true);

  startWatch(path.join(workspace.root, reportPath));

  context.subscriptions.push(
    workspace.registerAutocmd({
      event: ['BufEnter'],
      request: true,
      callback: async () => {
        const doc = await workspace.document;
        updateSign(doc, 'CocCoverageUncovered', signGroup, signPriority);
      },
    })
  );
}
