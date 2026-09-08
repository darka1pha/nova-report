#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import {
  loadReport,
  validateReport,
  renderReport,
  exportReport
} from '@report/engine';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'validate': {
        const file = args[1];
        if (!file) throw new Error('Missing report file path');
        const content = fs.readFileSync(path.resolve(file), 'utf-8');
        const report = JSON.parse(content);
        const res = validateReport(report);
        if (res.valid) {
          console.log(`✓ Report '${file}' is valid.`);
        } else {
          console.error(`✗ Report '${file}' has validation errors:`);
          res.errors?.forEach(e => console.error(`  - ${e}`));
          process.exit(1);
        }
        break;
      }

      case 'render': {
        const file = args[1];
        if (!file) throw new Error('Missing report file path');
        const dataFlagIdx = args.indexOf('--data');
        let data = {};
        if (dataFlagIdx !== -1 && args[dataFlagIdx + 1]) {
          const dataContent = fs.readFileSync(path.resolve(args[dataFlagIdx + 1]!), 'utf-8');
          data = JSON.parse(dataContent);
        }

        const outFlagIdx = args.indexOf('--output');
        const outPath = outFlagIdx !== -1 && args[outFlagIdx + 1] ? args[outFlagIdx + 1]! : 'rendered.json';

        const content = fs.readFileSync(path.resolve(file), 'utf-8');
        const report = loadReport(content);
        const result = await renderReport({ report, data });

        fs.writeFileSync(path.resolve(outPath), JSON.stringify(result, null, 2));
        console.log(`✓ Rendered report to '${outPath}' (${result.totalPages} pages).`);
        break;
      }

      case 'export': {
        const file = args[1];
        if (!file) throw new Error('Missing report file path');

        const formatFlagIdx = args.indexOf('--format');
        const format = formatFlagIdx !== -1 && args[formatFlagIdx + 1] ? args[formatFlagIdx + 1]! : 'pdf';

        const dataFlagIdx = args.indexOf('--data');
        let data = {};
        if (dataFlagIdx !== -1 && args[dataFlagIdx + 1]) {
          const dataContent = fs.readFileSync(path.resolve(args[dataFlagIdx + 1]!), 'utf-8');
          data = JSON.parse(dataContent);
        }

        const outFlagIdx = args.indexOf('--output');
        const outPath = outFlagIdx !== -1 && args[outFlagIdx + 1] ? args[outFlagIdx + 1]! : `output.${format}`;

        const content = fs.readFileSync(path.resolve(file), 'utf-8');
        const report = loadReport(content);
        const bytes = await exportReport({
          report,
          data,
          format
        });

        fs.writeFileSync(path.resolve(outPath), Buffer.from(bytes));
        console.log(`✓ Exported report to '${outPath}' (Format: ${format.toUpperCase()}, Size: ${bytes.length} bytes).`);
        break;
      }

      case 'inspect': {
        const file = args[1];
        if (!file) throw new Error('Missing report file path');
        const content = fs.readFileSync(path.resolve(file), 'utf-8');
        const report = loadReport(content);

        console.log(`Report Name:    ${report.name}`);
        console.log(`Version:        ${report.version}`);
        console.log(`Page Size:      ${report.page.width} x ${report.page.height} ${report.page.unit} (${report.page.orientation})`);
        console.log(`Direction:      ${report.page.direction || 'ltr'}`);
        console.log(`Sections:       ${report.sections.length} (${report.sections.map(s => s.type).join(', ')})`);
        console.log(`Data Sources:   ${report.dataSources.length} (${report.dataSources.map(d => d.name).join(', ')})`);
        console.log(`Parameters:     ${report.parameters.length} (${report.parameters.map(p => p.name).join(', ')})`);
        console.log(`Variables:      ${report.variables.length} (${report.variables.map(v => v.name).join(', ')})`);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
NextReport CLI

Usage:
  report validate <report.json>
  report render <report.json> [--data <data.json>] [--output <out.json>]
  report export <report.json> [--data <data.json>] [--format <pdf|docx|xlsx|html>] [--output <out.ext>]
  report inspect <report.json>
`);
}

main();
