import { useCallback, useEffect, useId } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { FieldRow, IconButton } from '@resourcepackbuilder/ui';
import { useErrorMessage } from '../../i18n/errors';
import { notify } from '../../shell/notify';
import { useOpenProject } from '../../store/project';
import { useTestServerStore } from '../../services/testServerStore';
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
  const id = useId();

  return (
    <FieldRow
      label={t('version')}
      htmlFor={id}
      help={t('versionHelp')}
      error={hasFailed ? t('versionsFailed', { error: errorMessage(loadError) }) : undefined}
      warning={
        !hasFailed && paperVersion && projectVersion && paperVersion !== projectVersion
          ? t('versionMismatch', { version: projectVersion })
          : undefined
      }
    >
      <div className="flex gap-1.5">
        <NativeSelect
          id={id}
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
    </FieldRow>
  );
}
