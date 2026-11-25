import fs from 'node:fs';
import { listChanges, changeFile } from '../openspec-adapter.mjs';
import { APPROVAL_FILE, readApprovals } from '../checks/approval.mjs';
import { UserError } from '../util.mjs';
import { t } from '../i18n.mjs';

/** Records a human approval for a change. Agents must not run this on their own. */
export function approve(root, [change], flags) {
  if (!change || typeof flags.by !== 'string') throw new UserError(t('USAGE', 'aiwf approve <change> --by <owner name>'));
  if (!listChanges(root).includes(change)) throw new UserError(t('CHANGE_MISSING', change));
  const approvals = readApprovals(root, change).filter((a) => a.by !== flags.by);
  approvals.push({ by: flags.by, date: new Date().toISOString().slice(0, 10) });
  fs.writeFileSync(changeFile(root, change, APPROVAL_FILE), JSON.stringify({ approvals }, null, 2) + '\n', 'utf8');
  console.log(t('APPROVED', change, flags.by));
  return 0;
}
