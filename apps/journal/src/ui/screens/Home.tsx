import { useNav } from '../../app/nav.js';
import { ScreenShell } from '../components/ScreenShell.js';
import './Home.css';

/**
 * Home — variant C, layout skeleton.
 *
 * The three buttons navigate for real; the screens behind them are stubs. The
 * journal section shows its empty state because nothing is seeded into the log
 * (D-2), and that empty state is the flat invitation the handoff asks for —
 * a statement, not an exclamation.
 */
export function Home() {
  const go = useNav((s) => s.go);

  return (
    <ScreenShell screen="home">
      <div className="home-cta">
        <button
          type="button"
          className="btn btn--inverse home-cta__brew"
          onClick={() => go('brew')}
        >
          ЗАВАРИТЬ
        </button>
        <button
          type="button"
          className="btn home-cta__conv"
          aria-label="КОНВЕРТЕР"
          onClick={() => go('conv')}
        >
          ⇄
        </button>
      </div>

      <button type="button" className="btn home-taste" onClick={() => go('diag')}>
        ОЦЕНИТЬ ЧАШКУ
      </button>

      <div className="home-feed">
        <div className="section-title">ЖУРНАЛ</div>
        <p className="empty">пока пусто — заварите первую чашку</p>
      </div>
    </ScreenShell>
  );
}
