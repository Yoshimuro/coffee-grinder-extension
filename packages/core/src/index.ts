/**
 * Public surface of the conversion engine. Apps import from `@coffee/core`
 * rather than reaching into files, so the internal layout stays free to move.
 */
export type {
  AnchorPoint,
  BrewMethod,
  Calibration,
  Confidence,
  Dataset,
  Grinder,
  GrinderScale,
} from './types.js';
export { CONFIDENCE_TOLERANCE } from './types.js';

export type { ConversionResult, SettingResult } from './convert.js';
export {
  convert,
  formatSetting,
  methodsFor,
  micronsToSetting,
  resolutionMicrons,
  settingSteps,
  settingToMicrons,
} from './convert.js';

export {
  DATASET,
  allGrinders,
  displayName,
  grinderById,
  groupByBrand,
  searchGrinders,
} from './dataset.js';
