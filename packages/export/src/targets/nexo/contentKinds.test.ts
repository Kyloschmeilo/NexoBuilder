/** Nexo's own content kinds besides items and media files: dialogs (plugins/Nexo/dialogs) and multipack.yml. */
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { parse } from 'yaml';
import { addMediaEntry, createDialog, createProject, type Project } from '@resourcepackbuilder/core/project';
import type { Issue } from '@resourcepackbuilder/utils';
import { planExport } from '../../plan';
import { planMultiExport } from '../../selection';
import { buildMultiExportZip, INSTALL_GUIDE_FILE } from '../../zip';
import { singleExport } from '../../../test-utils/export';
import { packTargetFor } from '../index';

const issueCodes = (issue: Issue): string[] => [...(issue.context ?? []).map((c) => c.code), issue.code];

function dialogProject(name = 'Dialoge', ns = 'dialoge'): Project {
  const project = createProject(name, ns, '1.21.11');
  addMediaEntry(project, 'dialog', 'Welcome', createDialog);
  const rules = addMediaEntry(project, 'dialog', 'Rules', createDialog);
  rules.config = { type: 'CONFIRM', yesButton: { label: 'Accept' }, noButton: { label: 'Leave' }, base: { title: 'Rules' } };
  return project;
}

describe('dialogs', () => {
  it('writes one file per dialog into plugins/Nexo/dialogs', async () => {
    const project = dialogProject();
    const plan = planExport(project);
    expect(plan.issues).toEqual([]);
    expect(parse(plan.pluginFiles.get('dialogs/rules.yml') as string)).toEqual({
      type: 'CONFIRM',
      yesButton: { label: 'Accept' },
      noButton: { label: 'Leave' },
      base: { title: 'Rules' },
    });
    expect(packTargetFor(project).layout.mediaFile(project, 'dialog')).toBe('dialogs/');
    const zip = await JSZip.loadAsync((await buildMultiExportZip(singleExport(project, plan), 'full')).data);
    expect(zip.file('dialogs/welcome.yml')).not.toBeNull();
    expect(await zip.file(INSTALL_GUIDE_FILE)!.async('string')).toContain('dialogs/');
  });

  it('reports dialog checks with the dialog as target and context', () => {
    const project = dialogProject();
    project.dialogs[0].config = { type: 'MULTI' };
    const issue = planExport(project).issues.find((i) => i.code === 'dialog.actionsMissing');
    expect(issue?.target).toEqual({ kind: 'dialog', id: project.dialogs[0].id });
    expect(issueCodes(issue!)).toEqual(['context.dialog', 'dialog.actionsMissing']);
  });

  it('reports the same dialog in two projects and leaves deselected dialogs out', () => {
    const multi = planMultiExport([{ project: dialogProject() }, { project: dialogProject('Kopie', 'kopie') }]);
    expect(multi.issues.some((i) => issueCodes(i).includes('selection.dialogIdClash') && JSON.stringify(i).includes('nexo:welcome'))).toBe(
      true,
    );
    const project = dialogProject();
    const selected = planMultiExport([
      { project, selection: { excludedItemIds: [], excludedGlyphIds: [], excludedDialogIds: [project.dialogs[0].id] } },
    ]);
    expect([...selected.projects[0].plan.pluginFiles.keys()].filter((path) => path.startsWith('dialogs/'))).toEqual(['dialogs/rules.yml']);
  });

  it('has no dialogs in CraftEngine projects', () => {
    const project = createProject('Ce', 'ce', '1.21.11', 'craftengine');
    expect(packTargetFor(project).layout.mediaFile(project, 'dialog')).toBeNull();
  });
});

describe('multipack.yml', () => {
  it('merges the templates of all projects into one multipack.yml next to the other root files', async () => {
    const a = createProject('A', 'a', '1.21.11');
    a.settings.multipack = { templates: { music: { default: true } }, menu: { title: 'Packs', rows: 1 } };
    const b = createProject('B', 'b', '1.21.11');
    b.settings.multipack = { templates: { tools_3d: { conflicts_with: ['music'] } } };
    const multi = planMultiExport([{ project: a }, { project: b }]);
    const zip = await JSZip.loadAsync((await buildMultiExportZip(multi, 'full')).data);
    expect(parse(await zip.file('multipack.yml')!.async('string'))).toEqual({
      templates: { music: { default: true }, tools_3d: { conflicts_with: 'music' } },
      menu: { title: 'Packs', rows: 1 },
    });
    expect(await zip.file(INSTALL_GUIDE_FILE)!.async('string')).toContain('multipack.yml');
  });

  it('reports templates a conflict names but no project has', () => {
    const project = createProject('A', 'a', '1.21.11');
    project.settings.multipack = { templates: { music: { conflicts_with: 'loud' } } };
    expect(planExport(project).issues.map((issue) => issue.code)).toContain('multipack.unknownTemplate');
  });
});
