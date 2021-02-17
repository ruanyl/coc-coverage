import fs from 'fs';
import chokidar from 'chokidar';
import { Document, ExtensionContext, Uri, window, workspace } from 'coc.nvim';
import path from 'path';
import debounce from 'lodash.debounce';
import { createFileCoverage } from 'istanbul-lib-coverage';

const DEFAULT_REPORT_PATH = '/coverage/coverage-final.json';
const signGroup = 'CocCoverage';
const cachedReport: { json: { [key: string]: any } } = {
  json: {},
};

function updateSign(doc: Document, sign: string, signGroup: string, signPriority: number) {
  const filepath = Uri.parse(doc.uri).fsPath;
  const stats = cachedReport.json[filepath];
  if (stats) {
    const fileCoverage = createFileCoverage(stats);
    const uncoveredLines = fileCoverage.getUncoveredLines();
    // const summary = fileCoverage.toSummary();

    workspace.nvim.pauseNotification();
    workspace.nvim.call('sign_unplace', [signGroup, { buffer: doc.bufnr }], true);
    uncoveredLines.forEach((lnum) => {
      workspace.nvim.call('sign_place', [0, signGroup, sign, doc.bufnr, { lnum: lnum, priority: signPriority }], true);
    });
    workspace.nvim.resumeNotification(false, true);
  }
}

export async function activate(context: ExtensionContext): Promise<void> {
  window.showMessage(`coc-coverage works!`);

  const config = workspace.getConfiguration('coverage');
  const signPriority = config.get<number>('signPriority', 10);
  const uncoveredSign = config.get<string>('uncoveredSign.text', '▣');
  const hlGroup = config.get<string>('uncoveredSign.hlGroup', 'UncoveredLine');
  const reportPath = config.get<string>('json.report.path', DEFAULT_REPORT_PATH);

  const debounceReadFile = debounce((path) => {
    const str = fs.readFileSync(path).toString();
    const json = JSON.parse(str);
    cachedReport.json = json;

    workspace.document.then((doc) => {
      updateSign(doc, 'CocCoverageUncovered', signGroup, signPriority);
    });
  }, 2000);

  function startWatch(path: string) {
    // Initial read
    debounceReadFile(path);

    // Start watcher
    const watcher = chokidar.watch(path, { persistent: true });
    watcher.on('change', (path) => {
      debounceReadFile(path);
    });
  }

  workspace.nvim.command(
    `sign define CocCoverageUncovered text=${uncoveredSign} texthl=CocCoverageUncoveredSign`,
    true
  );
  workspace.nvim.command(`hi default link CocCoverageUncoveredSign ${hlGroup}`, true);
  workspace.nvim.command(`hi UncoveredLine guifg=#ff2222`, true);

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
