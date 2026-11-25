import { format } from './messages.mjs';
import { rel } from './util.mjs';
import { t } from './i18n.mjs';

export class Report {
  constructor(root, language) {
    this.root = root;
    this.language = language;
    this.findings = [];
  }
  add(level, code, file, line, args) {
    this.findings.push({ level, code, file: rel(this.root, file), line, message: format(code, args, this.language) });
  }
  error(code, file, line, ...args) {
    this.add('error', code, file, line, args);
  }
  warn(code, file, line, ...args) {
    this.add('warn', code, file, line, args);
  }
  get errors() {
    return this.findings.filter((f) => f.level === 'error');
  }
  get warnings() {
    return this.findings.filter((f) => f.level === 'warn');
  }
  sorted() {
    return [...this.findings].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.code.localeCompare(b.code));
  }
  toText() {
    const lines = this.sorted().map((f) => `${f.file}:${f.line} ${f.level} ${f.code} ${f.message}`);
    lines.push(t('SUMMARY', this.errors.length, this.warnings.length));
    return lines.join('\n');
  }
  toJSON() {
    return { errors: this.errors.length, warnings: this.warnings.length, findings: this.sorted() };
  }
}
