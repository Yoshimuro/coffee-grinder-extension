/**
 * Спецификация — палитра, шкала и компоненты на одном экране.
 *
 * Живая страница, а не картинка: всё ниже нарисовано теми же токенами и теми
 * же компонентами, что и остальное приложение. Если токен поедет, поедет и
 * спека — тем она и полезна. Storybook ради этого не заводили (план S-1).
 *
 * Значения не дублируются текстом там, где их видно: образец цвета показывает
 * цвет, строка под ним называет переменную, по которой его берут.
 */

import { STR } from '../../data/strings.js';
import { useLang } from '../../db/repo/settings.js';
import {
  Chip,
  ChipRow,
  EmptyState,
  InverseButton,
  Row,
  ScreenHeader,
  Section,
  Stepper,
  Tag,
} from '../components/index.js';
import './settings/settings.css';

/**
 * Палитра в порядке рампы — от страницы к тексту.
 *
 * «В порядке нарастания яркости» — формулировка тёмной темы: на светлой рампа
 * идёт вниз. Порядок при этом тот же, потому что он и был про роль, а не про
 * число (BJ-9).
 *
 * Перечислены все пятнадцать цветовых токенов, а не десять, как раньше: экран
 * читает живые `var()`, и с полным списком он становится главной поверхностью
 * проверки темы — открыть, переключить чип в настройках, посмотреть, что
 * переехала вся рампа, а не её видимая часть.
 */
const PALETTE = [
  '--bg',
  '--plane',
  '--line-1',
  '--line-2',
  '--line-3',
  '--line-4',
  '--line-5',
  '--muted',
  '--faint',
  '--mid',
  '--dim',
  '--text-secondary',
  '--text',
  '--inverse-bg',
  '--inverse-text',
] as const;

/** Шкала кеглей: имя переменной и класс-утилита, которым она применяется. */
const TYPE_SCALE = [
  { cls: 'micro', name: '--fs-micro' },
  { cls: 'tech', name: '--fs-tech' },
  { cls: 'body', name: '--fs-body' },
  { cls: 'stepper-value', name: '--fs-stepper' },
  { cls: 'result', name: '--fs-result' },
] as const;

export function Spec() {
  const lang = useLang();
  const t = STR[lang];

  return (
    <section className="screen" data-screen="spec">
      <ScreenHeader title={t.spec_title} />

      <div className="screen__body">
        <Section label={t.spec_palette}>
          <div className="bj-spec__palette">
            {PALETTE.map((token) => (
              <div key={token} className="bj-spec__swatch">
                <div
                  className="bj-spec__chip"
                  style={{ background: `var(${token})` }}
                  aria-hidden="true"
                />
                <div className="bj-spec__token">{token}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section label={t.spec_type}>
          {TYPE_SCALE.map((row) => (
            <div key={row.name} className="bj-spec__type">
              <span className={row.cls}>123 · {t.appName}</span>
              <span className="bj-spec__token">{row.name}</span>
            </div>
          ))}
        </Section>

        <Section label={t.spec_comp}>
          <div className="bj-spec__comp">
            <InverseButton>{t.brew_start}</InverseButton>
            <ChipRow>
              <Chip label={t.log_all} active />
              <Chip label={t.log_f_perc} />
              <Chip label={t.log_f_imm} />
            </ChipRow>
            <div className="bj-spec__tags">
              <Tag label={t.form_beans} />
              <Tag label={t.form_drip} />
            </div>
            <Stepper label={t.brew_temp} min={70} max={100} step={1} value={94} unit={`${t.deg}C`} onChange={() => undefined} />
            <Row label={t.set_spec} sub={t.spec_grid} right="→" />
            <EmptyState text={t.wheel_empty} />
          </div>
        </Section>

        <Section label={t.spec_grid}>
          <div className="bj-spec__grid" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="bj-spec__grid-cell" />
            ))}
          </div>
          <div className="bj-spec__token">--grid 4px · --pad-screen 20px · --touch 48px</div>
        </Section>
      </div>
    </section>
  );
}
