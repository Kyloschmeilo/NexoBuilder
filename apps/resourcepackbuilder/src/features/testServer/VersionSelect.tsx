import { useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { IconButton } from '@resourcepackbuilder/ui';
import { FormField, FormHelp } from '../../components/FormField';
import { useErrorMessage } from '../../i18n/errors';
import { notify } from '../../shell/notify';
import { useOpenProject } from '../../store/project';
import { useTestServerStore } from '../../store/testServer';
import { useSetConfig, useTestServer } from './useTestServer';

/** The Minecraft (Paper) version of the server; the service loads the versions and picks the default. */
export function VersionSelect({ paperVersion, isLocked }: { paperVersion: string | null; isLocked: boolean }) {
  const t = useTranslations('media.testServer.setup');
  const testServer = useTestServer();
  const setConfig = useSetConfig();
  const errorMessage = useErrorMessage();
  const projectVersion = useOpenProject().settings.minecraftVersion;
  const versions = useTestServerStore((s) => s.paperVersions);
  const loadError = useTestServerStore((s) => s.paperVersionsError);
  const hasFailed = loadError !== null;

  // Loading is idempotent; it only fails when saving the default version fails
  const load = useCallback(() => {
    testServer.loadPaperVersions().catch((err: unknown) => notify('error', errorMessage(err)));
  }, [testServer, errorMessage]);
  useEffect(load, [load]);

  const options = versions ?? (paperVersion ? [paperVersion] : []);
  const help = hasFailed ? (
    <FormHelp error>{t('versionsFailed', { error: errorMessage(loadError) })}</FormHelp>
  ) : paperVersion && projectVersion && paperVersion !== projectVersion ? (
    <FormHelp>{t('versionMismatch', { version: projectVersion })}</FormHelp>
  ) : (
    <FormHelp>{t('versionHelp')}</FormHelp>
  );

  return (
    <FormField label={t('version')} description={help}>
      <div className="flex gap-1.5">
        <NativeSelect
          data-testid="test-server-version"
          className="min-w-0 flex-1"
          value={paperVersion ?? ''}
          disabled={isLocked || options.length === 0}
          onChange={(e) => setConfig({ paperVersion: e.target.value })}
        >
          {options.length === 0 && <NativeSelectOption value="">{hasFailed ? t('unavailable') : t('loadingVersions')}</NativeSelectOption>}
          {options.map((version) => (
            <NativeSelectOption key={version} value={version}>
              {version === projectVersion ? t('projectVersion', { version }) : version}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {hasFailed && (
          <IconButton label={t('retry')} variant="outline" size="icon" onClick={load}>
            <RefreshCw />
          </IconButton>
        )}
      </div>
    </FormField>
  );
}
