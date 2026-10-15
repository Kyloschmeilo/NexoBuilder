/** Checks of a model as written into the pack (texture paths already resolved). */
import type { Issue } from '../../issues';
import { compareVersions, getMcVersion } from '../../minecraft/versions';
import { analyseElements, isVanillaReference } from '../../model/javaModel';
import type { JavaModelJson } from '../../model/types';

/** `ownTextures`: texture references written by this export. */
export function validateModel(model: JavaModelJson, targetVersion: string, ownTextures: Set<string>): Issue[] {
  const analysis = analyseElements(model);
  const issues = [...analysis.issues];
  if (analysis.requiresVersion && compareVersions(analysis.requiresVersion, targetVersion) > 0) {
    issues.push({
      level: 'error',
      code: 'plan.modelNeedsVersion',
      args: { version: analysis.requiresVersion, target: getMcVersion(targetVersion).label },
    });
  }
  const isDefined = (key: string) => key === 'missing' || model.textures?.[key] !== undefined || !!model.parent;
  for (const [key, value] of Object.entries(model.textures ?? {})) {
    if (typeof value !== 'string') continue;
    if (value.startsWith('#')) {
      if (!isDefined(value.slice(1))) issues.push({ level: 'warning', code: 'plan.textureRefUndefined', args: { key, value } });
    } else if (!isVanillaReference(value) && !ownTextures.has(value)) {
      // Foreign references must be provided by another pack
      issues.push({ level: 'warning', code: 'plan.textureRefForeign', args: { key, value } });
    }
  }
  const faceKeys = new Set<string>();
  for (const el of model.elements ?? []) {
    for (const face of Object.values(el.faces ?? {})) {
      if (face?.texture?.startsWith('#')) faceKeys.add(face.texture.slice(1));
    }
  }
  for (const key of faceKeys) {
    if (!isDefined(key)) issues.push({ level: 'warning', code: 'plan.faceTextureUndefined', args: { key } });
  }
  return issues;
}
