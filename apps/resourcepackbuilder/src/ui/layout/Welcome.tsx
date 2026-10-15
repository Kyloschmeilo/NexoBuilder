import { useEffect, useId, useState } from 'react';
import { FolderOpen, FolderPlus, FolderSync, Package, Trash2, Upload } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { DEFAULT_MC_VERSION, MC_VERSIONS } from '@resourcepackbuilder/core/minecraft/versions';
import { NAMESPACE_PATTERN, slugify } from '@resourcepackbuilder/core/util';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@resourcepackbuilder/ui/components/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@resourcepackbuilder/ui/components/dialog';
import { Field, FieldError, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@resourcepackbuilder/ui/components/tabs';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { isStorageAvailable, listProjects, listSharedProjectIds, type ProjectSummary } from '../../state/persistence';
import { isShareAvailable } from '../../state/share';
import { useStore } from '../../state/store';
import { translator } from '../../i18n/locale';
import { openProjectFile, openSharedProjectFromFolder, openStoredProject, removeStoredProject, startNewProject } from '../projectActions';
import { Tip } from './parts';

export function NewProjectForm({ onDone }: { onDone?: () => void }) {
  const t = useTranslations('layout.projectForm');
  const id = useId();
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [nsEdited, setNsEdited] = useState(false);
  const [version, setVersion] = useState(DEFAULT_MC_VERSION);
  const defaultName = t('defaultName');
  const defaultSlug = slugify(defaultName, 'my_pack');
  const ns = nsEdited ? namespace : slugify(name || defaultName, defaultSlug);
  const nsError = !NAMESPACE_PATTERN.test(ns) ? t('namespaceInvalid') : ns === 'minecraft' ? t('namespaceMinecraft') : null;
  const submit = () => {
    if (nsError) return;
    startNewProject(name || defaultName, ns, version);
    onDone?.();
  };
  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>{t('name')}</FieldLabel>
        <Input
          id={`${id}-name`}
          autoFocus
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field data-invalid={!!nsError || undefined}>
          <FieldLabel htmlFor={`${id}-ns`}>{t('namespace')}</FieldLabel>
          <Input
            id={`${id}-ns`}
            className="font-mono"
            aria-invalid={!!nsError || undefined}
            value={ns}
            onChange={(e) => {
              setNsEdited(true);
              setNamespace(e.target.value.toLowerCase());
            }}
          />
          {nsError && <FieldError>{nsError}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-version`}>{t('version')}</FieldLabel>
          <NativeSelect id={`${id}-version`} value={version} onChange={(e) => setVersion(e.target.value)}>
            {MC_VERSIONS.map((v) => (
              <NativeSelectOption key={v.id} value={v.id}>
                {v.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Button size="lg" disabled={!!nsError} onClick={submit}>
        <FolderPlus /> {t('create')}
      </Button>
    </div>
  );
}

export function ProjectList({ onOpened }: { onOpened?: () => void }) {
  const t = useTranslations('layout.projectList');
  const tc = useTranslations('common');
  const format = useFormatter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());
  const currentId = useStore((s) => s.project?.id);
  const refresh = () => {
    void listProjects().then(setProjects).catch(() => setProjects([]));
    void listSharedProjectIds().then(setSharedIds).catch(() => undefined);
  };
  useEffect(refresh, []);
  if (!isStorageAvailable()) {
    return <div className="text-xs text-muted-foreground">{t('storageUnavailable')}</div>;
  }
  if (!projects) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner /> {tc('loading')}
      </div>
    );
  }
  if (projects.length === 0) return <div className="text-xs text-muted-foreground">{t('empty')}</div>;
  return (
    <div className="flex flex-col gap-1.5">
      {projects.map((p) => {
        const open = async () => {
          await openStoredProject(p.id);
          onOpened?.();
        };
        return (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 transition-colors outline-none hover:border-input hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => void open()}
            onKeyDown={(e) => {
              if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                void open();
              }
            }}
          >
            <Package className="size-4.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                {p.name}
                {p.id === currentId && <Badge>{t('current')}</Badge>}
                {sharedIds.has(p.id) && <Badge className="bg-success/15 text-success">{t('shared')}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {t.rich('meta', {
                  count: p.itemCount,
                  namespace: p.namespace,
                  date: format.dateTime(new Date(p.updatedAt), { dateStyle: 'medium', timeStyle: 'short' }),
                  mono: (chunks) => <span className="font-mono">{chunks}</span>,
                })}
              </div>
            </div>
            <Tip label={t('delete')}>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={t('delete')}
                onClick={(e) => {
                  e.stopPropagation();
                  const tl = translator('layout');
                  useStore.getState().openDialog({
                    type: 'confirm',
                    title: tl('projectList.deleteTitle'),
                    message: tl('projectList.deleteMessage', { name: p.name }),
                    confirmLabel: tl('projectList.deleteConfirm'),
                    danger: true,
                    onConfirm: () => void removeStoredProject(p.id).then(refresh),
                  });
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Trash2 />
              </Button>
            </Tip>
          </div>
        );
      })}
    </div>
  );
}

const STEPS = ['folders', 'model', 'properties', 'export'] as const;

export function Welcome() {
  const t = useTranslations('layout.welcome');
  return (
    <div className="min-h-0 min-w-0 overflow-auto">
      <div className="mx-auto max-w-[960px] px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-sm bg-primary font-heading text-[32px] leading-none font-bold text-primary-foreground">
            N
          </div>
          <h1 className="mt-4 mb-2 font-heading text-[56px] leading-[60px] font-bold tracking-[0.01em]">ResourcepackBuilder</h1>
          <p className="mx-auto max-w-[620px] text-lg leading-7 text-muted-foreground">{t('tagline')}</p>
        </div>
        <div className="grid grid-cols-[1.1fr_1fr] gap-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="font-heading">{t('newProject')}</CardTitle>
            </CardHeader>
            <CardContent>
              <NewProjectForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="font-heading">{t('savedProjects')}</CardTitle>
              <CardAction className="flex gap-1.5">
                {isShareAvailable() && (
                  <Button variant="outline" size="sm" onClick={() => void openSharedProjectFromFolder()}>
                    <FolderSync /> {t('openShared')}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => void openProjectFile()}>
                  <Upload /> {t('openFile')}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ProjectList />
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 grid grid-cols-4 gap-3">
          {STEPS.map((step, i) => (
            <div key={step} className="rounded-lg border border-border bg-card p-4 text-[13px] leading-5 text-muted-foreground">
              <div className="mb-2 inline-grid size-6 place-items-center rounded-sm border border-primary bg-primary/10 font-heading text-xs font-bold text-primary">
                {i + 1}
              </div>
              <b className="mb-1 block font-heading text-[13px] leading-4 font-semibold tracking-[0.06em] text-foreground uppercase">
                {t(`steps.${step}.title`)}
              </b>
              {t(`steps.${step}.text`)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjectsDialog({ initialTab = 'open' }: { initialTab?: 'open' | 'new' }) {
  const t = useTranslations('layout');
  const close = useStore((s) => s.closeDialog);
  const [tab, setTab] = useState<'open' | 'new'>(initialTab);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg">
            <FolderOpen className="size-5" /> {t('projectsDialog.title')}
          </DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'open' | 'new')}>
          <TabsList variant="line">
            <TabsTrigger value="open">{t('projectsDialog.openTab')}</TabsTrigger>
            <TabsTrigger value="new">{t('projectsDialog.newTab')}</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="flex flex-col gap-3 pt-2">
            <div className="max-h-[360px] overflow-auto">
              <ProjectList onOpened={close} />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await openProjectFile();
                  close();
                }}
              >
                <Upload /> {t('welcome.openFile')}
              </Button>
              {isShareAvailable() && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (await openSharedProjectFromFolder()) close();
                  }}
                >
                  <FolderSync /> {t('welcome.openShared')}
                </Button>
              )}
            </div>
          </TabsContent>
          <TabsContent value="new" className="pt-2">
            <NewProjectForm onDone={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
