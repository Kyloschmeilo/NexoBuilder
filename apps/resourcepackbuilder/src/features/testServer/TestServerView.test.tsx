// @vitest-environment jsdom
/**
 * The test server view in each state (stopped, starting, running, error) and without the desktop program: it renders
 * the status pill with the state, the controls that fit the state and finds every one of its texts in both languages.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import { createProject } from '@resourcepackbuilder/core/project';
import { DEFAULT_TEST_SERVER_CONFIG, type TestServerStatus } from '@resourcepackbuilder/test-server';
import { MESSAGES_BY_LOCALE, SUPPORTED_LOCALES } from '@resourcepackbuilder/i18n';
import type { TestServerState } from '../../platform/desktopApi';
import { ServicesContext, type AppServices } from '../../services/bootstrap';
import type { TestServerSync } from '../../services/testServerSync';
import { useTestServerStore } from '../../services/testServerStore';
import { useProjectStore } from '../../store/project';
import { TestServerView } from './TestServerView';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function serverState(status: TestServerStatus, overrides: Partial<TestServerState> = {}): TestServerState {
  return {
    status,
    message: null,
    progress: null,
    config: {
      ...DEFAULT_TEST_SERVER_CONFIG,
      paperVersion: '1.21.8',
      eulaAccepted: true,
      playerName: 'Steve',
      pluginJars: { nexo: { name: 'nexo.jar', version: '1.0', file: 'nexo.jar' } },
    },
    target: 'nexo',
    installed: { paperVersion: '1.21.8', paperBuild: 1, javaPath: 'java', javaVersion: 21 },
    startedAt: status === 'running' ? 1_700_000_000_000 : null,
    lastSync: null,
    pack: { status: status === 'running' ? 'ready' : 'idle', message: null, at: null },
    serverDir: '/server',
    address: 'localhost:25565',
    ...overrides,
  };
}

/** Methods the view only calls on interaction or on mount; they resolve without doing anything. */
const FAKE_SERVICE = new Proxy({} as TestServerSync, {
  get: () => () => Promise.resolve(),
});

const mounted: Root[] = [];

function render(locale: (typeof SUPPORTED_LOCALES)[number], services: Partial<AppServices>): { html: string; container: HTMLElement } {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mounted.push(root);
  act(() =>
    root.render(
      <NextIntlClientProvider
        locale={locale}
        timeZone="UTC"
        messages={MESSAGES_BY_LOCALE[locale]}
        onError={(error) => {
          throw error;
        }}
      >
        <ServicesContext.Provider value={services as AppServices}>
          <TestServerView />
        </ServicesContext.Provider>
      </NextIntlClientProvider>,
    ),
  );
  const html = container.innerHTML;
  return { html, container };
}

/** The visible labels of all buttons. */
function buttonLabels(container: HTMLElement): string[] {
  return [...container.querySelectorAll('button')].map((b) => b.textContent.trim());
}

afterEach(() => {
  act(() => mounted.splice(0).forEach((root) => root.unmount()));
  document.body.innerHTML = '';
  useTestServerStore.setState({ server: null, log: [] });
});

describe('test server view', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const t = MESSAGES_BY_LOCALE[locale].media.testServer;

    it(`says it is desktop only without the service in ${locale}`, () => {
      const { container } = render(locale, { testServer: null });
      expect(container.textContent).toContain(t.desktopOnly);
    });

    it(`shows the stopped state with a start button in ${locale}`, () => {
      useProjectStore.setState({ project: createProject('P', 'p', '1.21.8', 'nexo') });
      useTestServerStore.setState({ server: serverState('stopped') });
      const { container } = render(locale, { testServer: FAKE_SERVICE });
      const status = container.querySelector('[data-testid="test-server-status"]');
      expect(status?.getAttribute('data-status')).toBe('stopped');
      expect(status?.textContent).toContain(t.status.stopped);
      expect(container.textContent).toContain(t.start);
      expect(buttonLabels(container)).not.toContain(t.stop);
    });

    it(`shows the starting state with the progress message and restart and stop in ${locale}`, () => {
      useProjectStore.setState({ project: createProject('P', 'p', '1.21.8', 'nexo') });
      useTestServerStore.setState({ server: serverState('starting', { message: 'Starting the server', progress: 40 }) });
      const { container } = render(locale, { testServer: FAKE_SERVICE });
      expect(container.querySelector('[data-testid="test-server-status"]')?.getAttribute('data-status')).toBe('starting');
      expect(container.textContent).toContain('Starting the server');
      expect(buttonLabels(container)).toEqual(expect.arrayContaining([t.restart, t.stop]));
    });

    it(`shows the running state with connect, sync and console in ${locale}`, () => {
      useProjectStore.setState({ project: createProject('P', 'p', '1.21.8', 'nexo') });
      useTestServerStore.setState({ server: serverState('running') });
      const { container } = render(locale, { testServer: FAKE_SERVICE });
      expect(container.querySelector('[data-testid="test-server-status"]')?.getAttribute('data-status')).toBe('running');
      expect(container.textContent).toContain('localhost:25565');
      expect(container.querySelector('[data-testid="test-server-console"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="test-server-command"]')).not.toBeNull();
      expect(container.textContent).toContain(t.pack.ready);
    });

    it(`shows the error state with its message in ${locale}`, () => {
      useProjectStore.setState({ project: createProject('P', 'p', '1.21.8', 'nexo') });
      useTestServerStore.setState({ server: serverState('error', { message: 'Port 25565 is in use' }) });
      const { container } = render(locale, { testServer: FAKE_SERVICE });
      expect(container.querySelector('[data-testid="test-server-status"]')?.getAttribute('data-status')).toBe('error');
      expect(container.textContent).toContain('Port 25565 is in use');
      expect(container.textContent).toContain(t.start);
    });

    it(`puts the setup first until a start is possible in ${locale}`, () => {
      useProjectStore.setState({ project: createProject('P', 'p', '1.21.8', 'nexo') });
      const base = serverState('stopped');
      useTestServerStore.setState({ server: { ...base, config: { ...base.config, eulaAccepted: false, pluginJars: {} } } });
      const { container } = render(locale, { testServer: FAKE_SERVICE });
      expect(container.textContent).toContain(t.setup.firstStartTitle);
      expect(container.querySelector('[data-testid="test-server-eula"]')).not.toBeNull();
    });
  }
});
