import { useId } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { FieldGroup, FieldRow, Section, StatusPill, useDraft } from '@resourcepackbuilder/ui';
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import {
  MAX_PLAYER_NAME_LENGTH,
  MAX_PORT,
  MIN_PORT,
  PLAYER_NAME_INVALID_CHARS,
  RAM_OPTIONS_GB,
  serverAdapterFor,
} from '@resourcepackbuilder/test-server';
import type { TestServerConfig } from '../../platform/desktopApi';
import { notify } from '../../shell/notify';
import { confirm } from '../../store/dialogs';
import { useBusyAction } from '../../hooks/useBusyAction';
import { useSetConfig, useTestServer } from './useTestServer';
import { VersionSelect } from './VersionSelect';

const EULA_URL = 'https://aka.ms/MinecraftEULA';

/**
 * Settings of the test server; most of them only apply on the next start. `target` is the open project's; `isReady`:
 * everything a start needs is set (the card is then no longer the first thing on the page).
 */
export function ServerSetup({
  config,
  isLocked,
  isReady,
  target,
}: {
  config: TestServerConfig;
  isLocked: boolean;
  isReady: boolean;
  target: PackTargetId;
}) {
  const t = useTranslations('media.testServer.setup');
  const setConfig = useSetConfig();
  const ramId = useId();

  return (
    <Section
      id="setup"
      title={isReady ? t('title') : t('firstStartTitle')}
      description={isLocked ? t('lockedDescription') : isReady ? t('description') : t('firstStartDescription')}
    >
      <FieldGroup>
        <PluginJarField config={config} target={target} />
        <VersionSelect paperVersion={config.paperVersion} isLocked={isLocked} />
        <PlayerNameField playerName={config.playerName} />
        <FieldRow label={t('ram')} htmlFor={ramId} help={t('ramHelp')}>
          <NativeSelect
            id={ramId}
            className="w-full"
            value={config.ramGb}
            disabled={isLocked}
            onChange={(e) => setConfig({ ramGb: Number(e.target.value) })}
          >
            {RAM_OPTIONS_GB.map((gb) => (
              <NativeSelectOption key={gb} value={gb}>
                {t('ramOption', { gb })}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FieldRow>
        <PortField label={t('port')} help={t('portHelp')} port={config.port} isLocked={isLocked} onCommit={(port) => setConfig({ port })} />
        <PortField
          label={t('packPort')}
          help={t('packPortHelp')}
          port={config.packPort}
          isLocked={isLocked}
          onCommit={(packPort) => setConfig({ packPort })}
        />
        <WorldField isLocked={isLocked} />
        <EulaField isAccepted={config.eulaAccepted} />
      </FieldGroup>
    </Section>
  );
}

/** A port typed in freely and saved when the input loses focus, once it is a whole number in the allowed range. */
function PortField({
  label,
  help,
  port,
  isLocked,
  onCommit,
}: {
  label: string;
  help: string;
  port: number;
  isLocked: boolean;
  onCommit: (port: number) => void;
}) {
  const t = useTranslations('media.testServer.setup');
  const { draft, setDraft, reset } = useDraft(
    port,
    (text) => {
      const value = Number(text);
      return Number.isInteger(value) && value >= MIN_PORT && value <= MAX_PORT ? { value } : undefined;
    },
    String,
  );
  const value = Number(draft);
  const isValid = Number.isInteger(value) && value >= MIN_PORT && value <= MAX_PORT;
  const id = useId();

  return (
    <FieldRow label={label} htmlFor={id} help={help} error={isValid ? undefined : t('portRange', { min: MIN_PORT, max: MAX_PORT })}>
      <Input
        id={id}
        className="font-mono"
        inputMode="numeric"
        value={draft}
        disabled={isLocked}
        aria-invalid={!isValid}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
        onBlur={() => {
          if (!isValid) reset();
          else if (value !== port) onCommit(value);
        }}
      />
    </FieldRow>
  );
}

/** Deletes the server's world (e.g. one that no longer loads); a fresh flat world is created on the next start. */
function WorldField({ isLocked }: { isLocked: boolean }) {
  const t = useTranslations('media.testServer.setup');
  const testServer = useTestServer();
  const { isBusy, run } = useBusyAction();
  const resetWorld = () =>
    run(async () => {
      const confirmed = await confirm({
        title: t('resetWorldTitle'),
        message: t('resetWorldMessage'),
        confirmLabel: t('resetWorld'),
        destructive: true,
      });
      if (!confirmed) return;
      await testServer.resetWorld();
      notify('success', t('worldResetDone'));
    });

  return (
    <FieldRow label={t('world')} help={t('worldHelp')}>
      <div>
        <Button variant="outline" size="sm" disabled={isBusy || isLocked} onClick={() => void resetWorld()}>
          <Trash2 /> {t('resetWorld')}
        </Button>
      </div>
    </FieldRow>
  );
}

/**
 * The plugin JAR of the project's target. A plugin on Modrinth (CraftEngine) is downloaded for the chosen Minecraft
 * version; choosing a JAR stays possible (e.g. a premium build). Nexo's JAR is always chosen.
 */
function PluginJarField({ config, target }: { config: TestServerConfig; target: PackTargetId }) {
  const t = useTranslations('media.testServer.setup');
  const testServer = useTestServer();
  const { isBusy, run } = useBusyAction();
  const adapter = serverAdapterFor(target);
  const plugin = adapter.pluginName;
  const canDownload = adapter.jar.kind === 'modrinth';
  const jar = config.pluginJars[target];
  const chooseJar = () =>
    run(async () => {
      const chosen = await testServer.choosePluginJar(target);
      if (chosen) notify('success', t('jarSelected', { plugin, version: chosen.version }));
    });
  const downloadJar = () =>
    run(async () => {
      const downloaded = await testServer.downloadPlugin(target);
      notify('success', t('jarSelected', { plugin, version: downloaded.version }));
    });

  return (
    <FieldRow
      label={t('plugin', { plugin })}
      help={canDownload ? t('jarDownloadHelp', { plugin }) : t('jarHelp', { plugin, target })}
      // A disabled button shows no tooltip, so the reason is written out
      error={jar ? undefined : t('noPlugin', { plugin })}
      warning={canDownload && !config.paperVersion ? t('downloadNeedsVersion') : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill dot tone={jar ? 'ok' : 'warning'} label={jar ? `${jar.name} ${jar.version}` : t('notSelected')} />
        {canDownload ? (
          <>
            <Button
              data-testid="test-server-download-plugin"
              variant="outline"
              size="sm"
              disabled={isBusy || !config.paperVersion}
              onClick={() => void downloadJar()}
            >
              <Download /> {t('downloadJar', { plugin })}
            </Button>
            <Button variant="link" size="sm" className="px-0" disabled={isBusy} onClick={() => void chooseJar()}>
              {t('chooseJarManually')}
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" disabled={isBusy} onClick={() => void chooseJar()}>
            <Upload /> {t('chooseJar')}
          </Button>
        )}
      </div>
    </FieldRow>
  );
}

/** The player name is saved when the input loses focus, not on every key. */
function PlayerNameField({ playerName }: { playerName: string }) {
  const t = useTranslations('media.testServer.setup');
  const setConfig = useSetConfig();
  const { draft, setDraft } = useDraft(
    playerName,
    (text) => ({ value: text }),
    (value) => value,
  );
  const id = useId();

  return (
    <FieldRow label={t('playerName')} htmlFor={id} help={t('playerHelp')}>
      <Input
        id={id}
        data-testid="test-server-player-name"
        value={draft}
        placeholder={t('playerPlaceholder')}
        maxLength={MAX_PLAYER_NAME_LENGTH}
        onChange={(e) => setDraft(e.target.value.replace(PLAYER_NAME_INVALID_CHARS, ''))}
        onBlur={() => {
          if (draft !== playerName) setConfig({ playerName: draft });
        }}
      />
    </FieldRow>
  );
}

function EulaField({ isAccepted }: { isAccepted: boolean }) {
  const t = useTranslations('media.testServer.setup');
  const setConfig = useSetConfig();
  const id = useId();

  return (
    <Field orientation="horizontal">
      <Checkbox
        id={id}
        data-testid="test-server-eula"
        checked={isAccepted}
        onCheckedChange={(checked) => setConfig({ eulaAccepted: checked })}
      />
      <FieldContent>
        <FieldLabel htmlFor={id} className="font-normal">
          {t.rich('eula', {
            link: (chunks) => (
              <a href={EULA_URL} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                {chunks}
              </a>
            ),
          })}
        </FieldLabel>
        <FieldDescription className="text-xs">{t('eulaHint')}</FieldDescription>
      </FieldContent>
    </Field>
  );
}
