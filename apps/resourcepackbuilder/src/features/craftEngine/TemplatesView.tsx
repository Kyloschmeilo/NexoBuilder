/**
 * The templates of a CraftEngine project: each with its id, its declared arguments and its body (config with
 * `${argument}` placeholders). The export writes them to configuration/templates.yml. The overview also holds a
 * searchable reference of CraftEngine's default templates, grouped by kind, with the arguments each takes.
 */
import { useState } from 'react';
import { LayoutTemplate, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CE_DEFAULT_TEMPLATES, CE_DOCS, type DefaultTemplate } from '@resourcepackbuilder/core/craftEngine';
import { craftEngineConfigFile } from '@resourcepackbuilder/export';
import { CopyButton, Panel, Section, Tip } from '@resourcepackbuilder/ui';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@resourcepackbuilder/ui/components/input-group';
import { RegistryPage } from './RegistryPage';

/** The kind of a default template: the first part of its path (`default:hardness/stone` → `hardness`). */
export function defaultTemplateGroup(id: string): string {
  const path = id.slice(id.indexOf(':') + 1);
  const slash = path.indexOf('/');
  return slash < 0 ? path : path.slice(0, slash);
}

/** The default templates matching `query` (id or argument name), grouped by kind in catalogue order. */
export function groupDefaultTemplates(templates: readonly DefaultTemplate[], query: string): [string, DefaultTemplate[]][] {
  const needle = query.trim().toLowerCase();
  const groups = new Map<string, DefaultTemplate[]>();
  for (const template of templates) {
    const names = [...(template.required ?? []), ...(template.optional ?? [])];
    if (needle && !template.id.toLowerCase().includes(needle) && !names.some((name) => name.toLowerCase().includes(needle))) continue;
    const group = defaultTemplateGroup(template.id);
    groups.set(group, [...(groups.get(group) ?? []), template]);
  }
  return [...groups];
}

/** One default template: its id, its arguments as chips (required ones marked) and a copy button. */
function DefaultTemplateRow({ template }: { template: DefaultTemplate }) {
  const t = useTranslations('media.templates');
  const tUi = useTranslations('ui');
  return (
    <li className="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1 border-t border-line px-3 py-1.5 first:border-t-0">
      <code className="min-w-0 truncate font-mono text-label">{template.id}</code>
      <span className="flex flex-1 flex-wrap gap-1">
        {template.required?.map((name) => (
          <Tip key={name} label={t('argumentRequired')}>
            <span className="rounded-sm border border-current px-1.5 font-mono text-micro text-warning">{name}*</span>
          </Tip>
        ))}
        {template.optional?.map((name) => (
          <Tip key={name} label={t('argumentOptional')}>
            <span className="rounded-sm border border-line px-1.5 font-mono text-micro text-text-muted">{name}</span>
          </Tip>
        ))}
      </span>
      <CopyButton text={template.id} label={t('copyId')} copiedLabel={tUi('copyButton.copied')} />
    </li>
  );
}

/** CraftEngine's default templates as a searchable reference, one collapsible group per kind. */
function DefaultTemplatesSection() {
  const t = useTranslations('media.templates');
  const [query, setQuery] = useState('');
  const groups = groupDefaultTemplates(CE_DEFAULT_TEMPLATES, query);
  const isSearching = query.trim() !== '';
  return (
    <Section id="defaults" title={t('defaults')} description={t('defaultsHint')}>
      <InputGroup className="mb-2.5 h-7.5 max-w-80">
        <InputGroupAddon>
          <Search className="size-3.5" />
        </InputGroupAddon>
        <InputGroupInput
          aria-label={t('searchDefaults')}
          placeholder={t('searchDefaults')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </InputGroup>
      {groups.length === 0 ? (
        <p className="m-0 text-label text-text-muted">{t('noDefaults')}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {groups.map(([group, templates]) => (
            // Keyed by the search state: groups open while searching and close again afterwards
            <details key={`${group}:${isSearching}`} open={isSearching}>
              <summary className="flex cursor-pointer items-center gap-2 rounded-sm py-1 text-label font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="font-mono">{group}</span>
                <span className="text-micro font-normal text-text-muted">{templates.length}</span>
              </summary>
              <Panel className="mt-1 mb-2 overflow-hidden">
                <ul className="m-0 flex list-none flex-col p-0">
                  {templates.map((template) => (
                    <DefaultTemplateRow key={template.id} template={template} />
                  ))}
                </ul>
              </Panel>
            </details>
          ))}
        </div>
      )}
    </Section>
  );
}

export function TemplatesView() {
  return (
    <RegistryPage
      view="templates"
      icon={LayoutTemplate}
      docs={CE_DOCS.templates}
      file={(project) => craftEngineConfigFile(project, 'templates')}
      after={<DefaultTemplatesSection />}
    />
  );
}
