/** For PNG drafts: which model the textures become, and which texture goes into which slot. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import type { ImportFile } from '@resourcepackbuilder/core/model/types';
import {
  TEXTURE_TEMPLATES,
  getTextureTemplate,
  isTextureTemplateId,
  suggestSlotAssignment,
  templateSlots,
  type TextureTemplate,
} from '@resourcepackbuilder/core/model/textureModel';
import { runDraft, type ImportDraft } from '@resourcepackbuilder/core/model/drafts';
import { Field, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { AutoGrid } from '@resourcepackbuilder/ui';
import { useSchemaText } from '../../components/useSchemaText';

interface TextureSlotsProps {
  draft: ImportDraft;
  template: TextureTemplate;
  pngs: ImportFile[];
  /** Receives the draft converted again with the new choice */
  onChange: (draft: ImportDraft) => void;
}

export function TextureSlots({ draft, template, pngs, onChange }: TextureSlotsProps) {
  const t = useTranslations('dialogs.newItem');
  const schemaText = useSchemaText();
  const id = useId();
  const update = (patch: Partial<ImportDraft>) => onChange(runDraft({ ...draft, ...patch }));
  const showSlots = !template.multiLayer || pngs.length > 1;
  return (
    <div className="flex flex-col gap-2">
      <Field>
        <FieldLabel htmlFor={`${id}-template`}>{t('modelKind')}</FieldLabel>
        <NativeSelect
          id={`${id}-template`}
          className="w-full"
          value={template.id}
          onChange={(e) => {
            if (!isTextureTemplateId(e.target.value)) return;
            const next = getTextureTemplate(e.target.value);
            update({ template: next.id, assignment: suggestSlotAssignment(next, pngs) });
          }}
        >
          {TEXTURE_TEMPLATES.map((option) => (
            <NativeSelectOption key={option.id} value={option.id}>
              {schemaText(option.label)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription>{schemaText(template.description)}</FieldDescription>
      </Field>
      {showSlots && (
        <AutoGrid min="12rem" fit>
          {templateSlots(template, pngs.length).map((slot) => (
            <Field key={slot}>
              <FieldLabel htmlFor={`${id}-${slot}`} className="font-mono">
                {slot}
              </FieldLabel>
              <NativeSelect
                id={`${id}-${slot}`}
                className="w-full"
                value={draft.assignment?.[slot] ?? ''}
                onChange={(e) => update({ assignment: { ...draft.assignment, [slot]: e.target.value } })}
              >
                <NativeSelectOption value="">{t('noTexture')}</NativeSelectOption>
                {pngs.map((png) => (
                  <NativeSelectOption key={png.name} value={png.name}>
                    {png.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ))}
        </AutoGrid>
      )}
    </div>
  );
}
