/**
 * Список девайсов — свои воронки, чайники и прессы.
 *
 * Каждая строка начинается с чертежа, а не с иконки: девайсы у одного человека
 * различаются не названиями (их часто и нет), а формой — конус против корзины
 * видно мгновенно, «Воронка 2» против «Воронка 3» не видно никогда.
 *
 * Каталога марок здесь нет намеренно (D-3): девайс описывается признаками, и
 * три заготовки лежат в конструкторе, а не в этом списке.
 */

import { useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { useDevices } from '../../db/repo/devices.js';
import { useLang } from '../../db/repo/settings.js';
import { EmptyState, Row, ScreenHeader } from '../components/index.js';
import { DevSvg } from './devices/DevSvg.js';
import { useDeviceDraft } from './devices/device-store.js';
import { devLine } from './devices/dev-view.js';
import './devices/devices.css';

export function Devices() {
  const go = useNav((s) => s.go);
  const lang = useLang();
  const t = STR[lang];

  const devices = useDevices();
  const { startNew, startEdit } = useDeviceDraft();

  const add = () => {
    startNew();
    go('device');
  };

  return (
    <section className="screen" data-screen="devices">
      <ScreenHeader
        title={t.dev_title}
        right={
          <button type="button" className="bj-dev__new" data-testid="device-new" onClick={add}>
            + {t.dev_new}
          </button>
        }
      />

      <div className="screen__body">
        {(devices ?? []).map((device) => (
          <Row
            key={device.id}
            lead={<DevSvg device={device} />}
            label={device.name}
            sub={devLine(device, lang)}
            right="→"
            onClick={() => {
              startEdit(device);
              go('device');
            }}
          />
        ))}

        {devices !== undefined && devices.length === 0 ? (
          <EmptyState text={t.dev_new} onClick={add} />
        ) : null}
      </div>
    </section>
  );
}
