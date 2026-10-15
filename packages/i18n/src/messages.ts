import type { MessageKeys, NestedKeyOf } from 'next-intl';
import type { SupportedLocale } from './locale';
import en_common from './messages/en/common.json' with { type: 'json' };
import en_schema from './messages/en/schema.json' with { type: 'json' };
import en_issues from './messages/en/issues.json' with { type: 'json' };
import en_ui from './messages/en/ui.json' with { type: 'json' };
import en_editor from './messages/en/editor.json' with { type: 'json' };
import en_preview from './messages/en/preview.json' with { type: 'json' };
import en_layout from './messages/en/layout.json' with { type: 'json' };
import en_dialogs from './messages/en/dialogs.json' with { type: 'json' };
import en_item from './messages/en/item.json' with { type: 'json' };
import en_media from './messages/en/media.json' with { type: 'json' };
import en_app from './messages/en/app.json' with { type: 'json' };
import en_desktop from './messages/en/desktop.json' with { type: 'json' };
import de_common from './messages/de/common.json' with { type: 'json' };
import de_schema from './messages/de/schema.json' with { type: 'json' };
import de_issues from './messages/de/issues.json' with { type: 'json' };
import de_ui from './messages/de/ui.json' with { type: 'json' };
import de_editor from './messages/de/editor.json' with { type: 'json' };
import de_preview from './messages/de/preview.json' with { type: 'json' };
import de_layout from './messages/de/layout.json' with { type: 'json' };
import de_dialogs from './messages/de/dialogs.json' with { type: 'json' };
import de_item from './messages/de/item.json' with { type: 'json' };
import de_media from './messages/de/media.json' with { type: 'json' };
import de_app from './messages/de/app.json' with { type: 'json' };
import de_desktop from './messages/de/desktop.json' with { type: 'json' };

/** The English catalogue, one top-level key per namespace. English is the source every other locale must match. */
const en = {
  common: en_common,
  schema: en_schema,
  issues: en_issues,
  ui: en_ui,
  editor: en_editor,
  preview: en_preview,
  layout: en_layout,
  dialogs: en_dialogs,
  item: en_item,
  media: en_media,
  app: en_app,
  desktop: en_desktop,
};

/** The typed shape of the message catalogue, derived from the English source. */
export type Messages = typeof en;

/** A top-level namespace of the catalogue. */
export type Namespace = keyof Messages;

/** A full (dotted) message key inside `namespace`, e.g. `MessageKey<'common'>` includes `'languageNames.en'`. */
export type MessageKey<N extends Namespace> = MessageKeys<Messages[N], NestedKeyOf<Messages[N]>>;

/** A message key in the `schema` namespace: the labels, help texts and options of core's Nexo data. */
export type SchemaKey = MessageKey<'schema'>;

/** A message key in the `issues` namespace: the codes of core's issues and errors. */
export type IssueKey = MessageKey<'issues'>;

const de = {
  common: de_common,
  schema: de_schema,
  issues: de_issues,
  ui: de_ui,
  editor: de_editor,
  preview: de_preview,
  layout: de_layout,
  dialogs: de_dialogs,
  item: de_item,
  media: de_media,
  app: de_app,
  desktop: de_desktop,
} satisfies Messages;

/** The message catalogue of every supported locale. */
export const messagesByLocale: Record<SupportedLocale, Messages> = { en, de };
