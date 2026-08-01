import { convert, formatSetting, settingToMicrons } from '../core/convert.js';
import { DATASET, allGrinders, grinderById } from '../core/dataset.js';
import type { Grinder } from '../core/types.js';
import { createGrinderPicker, type GrinderPicker } from './grinder-picker.js';
import { loadPrefs, pushRecent, savePrefs } from './prefs.js';

const el = <T extends HTMLElement>(testId: string): T => {
  const node = document.querySelector<T>(`[data-testid="${testId}"]`);
  if (!node) throw new Error(`missing element: ${testId}`);
  return node;
};

let fromPicker: GrinderPicker;
let toPicker: GrinderPicker;
let recentIds: string[] = [];

const settingInput = el<HTMLInputElement>('from-setting');
const downBtn = el<HTMLButtonElement>('setting-down');
const upBtn = el<HTMLButtonElement>('setting-up');

const fromHint = el<HTMLParagraphElement>('from-hint');
const resultValue = el<HTMLSpanElement>('result-value');
const resultUnit = el<HTMLSpanElement>('result-unit');
const resultBand = el<HTMLParagraphElement>('result-band');
const micronsOut = el<HTMLParagraphElement>('microns');
const methodsOut = el<HTMLUListElement>('methods');
const warningOut = el<HTMLParagraphElement>('warning');
const datasetMeta = el<HTMLSpanElement>('dataset-meta');

const UNIT_PLURAL: Record<Grinder['scale']['unit'], string> = {
  click: 'clicks',
  number: 'setting',
  mark: 'marks',
};

function currentFrom(): Grinder {
  return grinderById(fromPicker.getSelected()) ?? allGrinders()[0]!;
}

function currentTo(): Grinder {
  return grinderById(toPicker.getSelected()) ?? allGrinders()[1] ?? allGrinders()[0]!;
}

/**
 * Keep the setting inside the selected grinder's range and on its detents.
 * Called whenever the source grinder changes, since a value valid on a 200-click
 * dial is nonsense on a 40-click one.
 */
function clampSettingToGrinder(grinder: Grinder): void {
  const { min, max, step } = grinder.scale;
  settingInput.min = String(min);
  settingInput.max = String(max);
  settingInput.step = String(step);

  const raw = Number(settingInput.value);
  const value = Number.isFinite(raw) ? raw : min + (max - min) / 2;
  const snapped = Math.min(Math.max(min + Math.round((value - min) / step) * step, min), max);
  settingInput.value = String(Number(snapped.toFixed(4)));
}

function nudge(direction: 1 | -1): void {
  const grinder = currentFrom();
  const { min, max, step } = grinder.scale;
  const next = Number(settingInput.value) + direction * step;
  settingInput.value = String(Number(Math.min(Math.max(next, min), max).toFixed(4)));
  render();
}

function render(): void {
  const from = currentFrom();
  const to = currentTo();
  clampSettingToGrinder(from);

  const setting = Number(settingInput.value);
  const sourceMicrons = settingToMicrons(from, setting);

  fromHint.textContent =
    `${formatSetting(from, setting)} ${UNIT_PLURAL[from.scale.unit]} · ` +
    `${Math.round(sourceMicrons)} µm`;

  downBtn.disabled = setting <= from.scale.min;
  upBtn.disabled = setting >= from.scale.max;

  if (from.id === to.id) {
    resultValue.textContent = formatSetting(to, setting);
    resultUnit.textContent = UNIT_PLURAL[to.scale.unit];
    resultBand.textContent = 'Same grinder';
    micronsOut.textContent = `${Math.round(sourceMicrons)} µm`;
    renderMethods(from, setting);
    setWarning(null);
    return;
  }

  const result = convert(from, setting, to, DATASET.methods);

  resultValue.textContent = formatSetting(to, result.target.snapped);
  resultUnit.textContent = UNIT_PLURAL[to.scale.unit];

  resultBand.textContent =
    result.band.low === result.band.high
      ? 'within one detent'
      : `range ${formatSetting(to, result.band.low)} – ${formatSetting(to, result.band.high)}`;

  micronsOut.textContent =
    `${result.microns} µm · ${to.model} resolves ${result.resolutionMicrons} µm per ${to.scale.unit}`;

  methodsOut.replaceChildren(
    ...result.methods.map((m) => {
      const li = document.createElement('li');
      li.textContent = m.name;
      return li;
    }),
  );

  setWarning(warningFor(from, to, result.target.clamped));
}

function renderMethods(grinder: Grinder, setting: number): void {
  const microns = settingToMicrons(grinder, setting);
  methodsOut.replaceChildren(
    ...DATASET.methods
      .filter((m) => microns >= m.min && microns <= m.max)
      .map((m) => {
        const li = document.createElement('li');
        li.textContent = m.name;
        return li;
      }),
  );
}

function warningFor(from: Grinder, to: Grinder, clamped: boolean): string | null {
  if (clamped) {
    return `${to.model} cannot reach this grind size — showing its nearest end of range.`;
  }
  const weakest = [from, to].filter((g) => g.confidence === 'estimated');
  if (weakest.length > 0) {
    return `Calibration for ${weakest.map((g) => g.model).join(' and ')} is estimated, not published. Use the range as a starting point.`;
  }
  return null;
}

function setWarning(message: string | null): void {
  warningOut.hidden = message === null;
  warningOut.textContent = message ?? '';
}

async function persist(): Promise<void> {
  await savePrefs({
    fromId: fromPicker.getSelected(),
    toId: toPicker.getSelected(),
    fromSetting: Number(settingInput.value),
    recentIds,
  });
}

async function init(): Promise<void> {
  datasetMeta.textContent = `${allGrinders().length} grinders · v${DATASET.version}`;

  const grinders = allGrinders();
  const prefs = await loadPrefs();
  recentIds = prefs.recentIds;

  const fromId = (prefs.fromId && grinderById(prefs.fromId)?.id) || grinders[0]!.id;
  const toId = (prefs.toId && grinderById(prefs.toId)?.id) || (grinders[1] ?? grinders[0]!).id;

  // Both fields share one history, so a pick in either updates the other.
  const onPick = (id: string): void => {
    recentIds = pushRecent(recentIds, id);
    fromPicker.setRecents(recentIds);
    toPicker.setRecents(recentIds);
    render();
    void persist();
  };

  fromPicker = createGrinderPicker({
    mount: el<HTMLElement>('from-grinder'),
    grinders,
    selectedId: fromId,
    label: 'Source grinder',
    onSelect: onPick,
  });

  toPicker = createGrinderPicker({
    mount: el<HTMLElement>('to-grinder'),
    grinders,
    selectedId: toId,
    label: 'Target grinder',
    onSelect: onPick,
  });

  fromPicker.setRecents(recentIds);
  toPicker.setRecents(recentIds);

  const from = currentFrom();
  settingInput.value = String(
    prefs.fromSetting ?? Math.round((from.scale.min + from.scale.max) / 2),
  );

  render();

  settingInput.addEventListener('change', () => {
    render();
    void persist();
  });
  settingInput.addEventListener('input', render);

  downBtn.addEventListener('click', () => {
    nudge(-1);
    void persist();
  });
  upBtn.addEventListener('click', () => {
    nudge(1);
    void persist();
  });

  document.body.dataset.ready = 'true';
}

void init();
