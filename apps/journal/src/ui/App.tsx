/**
 * The whole app is one screen at a time plus an optional bottom bar.
 *
 * The lookup below stands in for a switch: typed as `Record<Screen, ...>` it is
 * a compile error to add a screen to the union and forget its component, which
 * a `switch` would only catch with an extra never-check.
 */

import type { ComponentType } from 'react';

import { type Screen, isTab, useNav } from '../app/nav.js';
import { TabBar } from './components/TabBar.js';
import { Bean } from './screens/Bean.js';
import { BeanAdd } from './screens/BeanAdd.js';
import { Brew } from './screens/Brew.js';
import { Compare } from './screens/Compare.js';
import { Conv } from './screens/Conv.js';
import { Detail } from './screens/Detail.js';
import { Device } from './screens/Device.js';
import { Devices } from './screens/Devices.js';
import { Diag } from './screens/Diag.js';
import { Home } from './screens/Home.js';
import { Log } from './screens/Log.js';
import { More } from './screens/More.js';
import { RateLater } from './screens/RateLater.js';
import { Shelf } from './screens/Shelf.js';
import { Spec } from './screens/Spec.js';
import { Timer } from './screens/Timer.js';
import { Wheel } from './screens/Wheel.js';

const VIEWS: Record<Screen, ComponentType> = {
  home: Home,
  conv: Conv,
  shelf: Shelf,
  bean: Bean,
  beanAdd: BeanAdd,
  devices: Devices,
  device: Device,
  brew: Brew,
  timer: Timer,
  rateLater: RateLater,
  diag: Diag,
  wheel: Wheel,
  log: Log,
  detail: Detail,
  compare: Compare,
  more: More,
  spec: Spec,
};

export function App() {
  const screen = useNav((s) => s.screen);
  const View = VIEWS[screen];

  return (
    <div className="app">
      <View />
      {/* Табы только на корневых экранах — иначе вложенность не читается. */}
      {isTab(screen) ? <TabBar /> : null}
    </div>
  );
}
