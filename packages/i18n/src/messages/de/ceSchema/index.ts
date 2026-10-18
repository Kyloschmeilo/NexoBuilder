/**
 * The `ceSchema` namespace of the German catalogue, assembled from one JSON file per property group or logic catalog.
 * A new group file is added to the import list here and in the other locale.
 */
import { mergeCatalogue } from '../../../mergeCatalogue';
import attributes from './attributes.json' with { type: 'json' };
import blockBehavior from './blockBehavior.json' with { type: 'json' };
import blockSettings from './blockSettings.json' with { type: 'json' };
import craftEngine from './craftEngine.json' with { type: 'json' };
import data from './data.json' with { type: 'json' };
import events from './events.json' with { type: 'json' };
import furniture from './furniture.json' with { type: 'json' };
import general from './general.json' with { type: 'json' };
import itemBehavior from './itemBehavior.json' with { type: 'json' };
import logicBlockBehaviors from './logicBlockBehaviors.json' with { type: 'json' };
import logicConditions from './logicConditions.json' with { type: 'json' };
import logicFunctions from './logicFunctions.json' with { type: 'json' };
import logicLoot from './logicLoot.json' with { type: 'json' };
import logicNumbers from './logicNumbers.json' with { type: 'json' };
import logicShared from './logicShared.json' with { type: 'json' };
import logicTriggers from './logicTriggers.json' with { type: 'json' };
import loot from './loot.json' with { type: 'json' };
import misc from './misc.json' with { type: 'json' };
import projectSections from './projectSections.json' with { type: 'json' };
import settings from './settings.json' with { type: 'json' };

export default mergeCatalogue(
  attributes,
  blockBehavior,
  blockSettings,
  craftEngine,
  data,
  events,
  furniture,
  general,
  itemBehavior,
  logicBlockBehaviors,
  logicConditions,
  logicFunctions,
  logicLoot,
  logicNumbers,
  logicShared,
  logicTriggers,
  loot,
  misc,
  projectSections,
  settings,
);
