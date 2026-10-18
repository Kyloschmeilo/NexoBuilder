/**
 * The `schema` namespace of the German catalogue, assembled from one JSON file per property group or logic catalog.
 * A new group file is added to the import list here and in the other locale.
 */
import { mergeCatalogue } from '../../../mergeCatalogue';
import appearance from './appearance.json' with { type: 'json' };
import attributes from './attributes.json' with { type: 'json' };
import components from './components.json' with { type: 'json' };
import customBlock from './customBlock.json' with { type: 'json' };
import furniture from './furniture.json' with { type: 'json' };
import general from './general.json' with { type: 'json' };
import itemModel from './itemModel.json' with { type: 'json' };
import mechanics from './mechanics.json' with { type: 'json' };
import misc from './misc.json' with { type: 'json' };
import options from './options.json' with { type: 'json' };
import shared from './shared.json' with { type: 'json' };
import textureTemplates from './textureTemplates.json' with { type: 'json' };
import validation from './validation.json' with { type: 'json' };
import variants from './variants.json' with { type: 'json' };

export default mergeCatalogue(
  appearance,
  attributes,
  components,
  customBlock,
  furniture,
  general,
  itemModel,
  mechanics,
  misc,
  options,
  shared,
  textureTemplates,
  validation,
  variants,
);
