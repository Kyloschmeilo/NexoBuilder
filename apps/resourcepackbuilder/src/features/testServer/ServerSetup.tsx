import { useId } from 'react';
import { Download, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { AutoGrid, SectionCard, StatusBadge, useDraft } from '@resourcepackbuilder/ui';
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import {
  MAX_PLAYER_NAME_LENGTH,
  MAX_PORT,
  MIN_PORT,
  PLAYER_NAME_INVALID_CHARS,
  RAM_OPTIONS_GB,
  serverAdapterFor,
} from '@resourcepackbuilder/test-server';
import { FormField, FormHelp } from '../../components/FormField';
import type { TestServerConfig } from '../../platform/desktopApi';
import { notify } from '../../shell/notify';
import { useBusyAction } from '../../hooks/useBusyAction';
import { useSetConfig, useTestServer } from './useTestServer';
import { VersionSelect } from './VersionSelect';

const EULA_URL = 'https://aka.ms/MinecraftEULA';

/** Settings of the test server; most of them only apply on the next start. `target` is the open project's. */
export function ServerSetup({ config, isLocked, target }: { config: TestServerConfig; isLocked: boolean; target: PackTargetId }) {
  const t = useTranslations('media.testServer.setup');
  const setConfig = useSetConfig();

  return (
    <SectionCard
      size="sm"
      title={t('title')}
      description={isLocked ? t('lockedDescription') : t('description')}
      contentClassName="flex flex-col gap-4"
    >
      <AutoGrid min="15rem" fit>
        <PluginJarField config={config} target={target} />
        <VersionSelect paperVersion={config.paperVersion} isLocked={isLocked} />
        <PlayerNameField playerName={config.playerName} />
        <FormField label={t('ram')} description={<FormHelp>{t('ramHelp')}</FormHelp>}>
          <NativeSelect
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
        </FormField>
        <FormField label={t('port')} description={<FormHelp>{t('portHelp', { packPort: config.packPort })}</FormHelp>}>
          <Input
            className="font-mono"
            type="number"
            min={MIN_PORT}
            max={MAX_PORT}
            value={config.port}
            disabled={isLocked}
            onChange={(e) => setConfig({ port: Number(e.target.value) })}
          />
        </FormField>
      </AutoGrid>
      <EulaField isAccepted={config.eulaAccepted} />
    </SectionCard>
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
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{t('plugin', { plugin })}</span>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={jar ? 'success' : 'warning'}>{jar ? `${jar.name} ${jar.version}` : t('notSelected')}</StatusBadge>
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
      {/* A disabled button shows no tooltip, so the reason is written out */}
      {canDownload && !config.paperVersion && <FormHelp>{t('downloadNeedsVersion')}</FormHelp>}
      <FormHelp>{canDownload ? t('jarDownloadHelp', { plugin }) : t('jarHelp', { plugin, target })}</FormHelp>
    </div>
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

  return (
    <FormField label={t('playerName')} description={<FormHelp>{t('playerHelp')}</FormHelp>}>
      <Input
        data-testid="test-server-player-name"
        value={draft}
        placeholder={t('playerPlaceholder')}
        maxLength={MAX_PLAYER_NAME_LENGTH}
        onChange={(e) => setDraft(e.target.value.replace(PLAYER_NAME_INVALID_CHARS, ''))}
        onBlur={() => {
          if (draft !== playerName) setConfig({ playerName: draft });
        }}
      />
    </FormField>
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
