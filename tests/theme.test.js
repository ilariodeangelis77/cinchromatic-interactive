import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createThemeController, THEME_KEY } from '../dist/theme.js';

function setup({ saved = null, dark = false, blockedRead = false, blockedWrite = false } = {}) {
  const values = new Map([['cinchromatic-editor-v1', '{existing progress}']]);
  if (saved !== null) values.set(THEME_KEY, saved);
  const applications = [], listeners = new Set(), writes = [];
  const media = {
    matches: dark,
    addEventListener(type, handler) { listeners.add(handler); },
    removeEventListener(type, handler) { listeners.delete(handler); },
    change(matches) { this.matches = matches; listeners.forEach(handler => handler({ matches })); },
  };
  const storage = {
    getItem(key) { if (blockedRead) throw new Error('Blocked'); return values.get(key) ?? null; },
    setItem(key, value) { if (blockedWrite) throw new Error('Full'); writes.push(key); values.set(key, value); },
  };
  const controller = createThemeController({ getStorage: () => storage, media, apply: theme => applications.push(theme) });
  return { controller, values, media, applications, writes };
}

test('theme follows system initially and system changes until an explicit choice', () => {
  for (const dark of [false, true]) {
    const state = setup({ dark });
    assert.equal(state.controller.current, dark ? 'dark' : 'light');
    state.media.change(!dark);
    assert.equal(state.controller.current, dark ? 'light' : 'dark');
    assert.deepEqual(state.writes, []);
  }
  const fallback = createThemeController({ getStorage: () => null, media: null, apply() {} });
  assert.equal(fallback.current, 'light');
});

test('both saved themes override the system and survive reload without changing editor progress', () => {
  for (const saved of ['light', 'dark']) {
    const state = setup({ saved, dark: saved !== 'dark' });
    assert.equal(state.controller.current, saved);
    state.media.change(saved !== 'dark');
    assert.equal(state.controller.current, saved);
    const choice = saved === 'light' ? 'dark' : 'light';
    state.controller.choose(choice);
    state.media.change(choice !== 'dark');
    assert.equal(state.controller.current, choice);
    assert.equal(state.values.get(THEME_KEY), choice);
    assert.equal(state.values.get('cinchromatic-editor-v1'), '{existing progress}');
    assert.deepEqual(state.writes, [THEME_KEY]);
    assert.equal(setup({ saved: state.values.get(THEME_KEY), dark: choice !== 'dark' }).controller.current, choice);
  }
});

test('malformed saved values follow the system and invalid choices cannot corrupt the current theme', () => {
  for (const saved of ['system', '', 'DARK', '{"theme":"light"}']) {
    const state = setup({ saved, dark: true });
    assert.equal(state.controller.current, 'dark');
    state.media.change(false);
    assert.equal(state.controller.current, 'light');
    assert.throws(() => state.controller.choose('blue'));
    assert.equal(state.controller.current, 'light');
    assert.deepEqual(state.writes, []);
  }
});

test('blocked or full storage still retains an explicit choice during the session', () => {
  for (const options of [{ blockedRead: true }, { blockedWrite: true }, { blockedRead: true, blockedWrite: true }]) {
    const state = setup(options);
    state.controller.choose('dark');
    state.media.change(false);
    assert.equal(state.controller.current, 'dark');
    assert.equal(state.applications.at(-1), 'dark');
  }
  const applied = [];
  const controller = createThemeController({ getStorage() { throw new Error('Denied'); }, media: { matches: true }, apply: value => applied.push(value) });
  controller.choose('light');
  assert.deepEqual(applied, ['dark', 'light']);
});

test('theme observers can be disposed without further system-driven updates', () => {
  const state = setup();
  state.controller.dispose();
  state.media.change(true);
  assert.equal(state.controller.current, 'light');
});

test('prepaint initialization uses the same defaults, saved preference, and guarded storage as the selector', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match && match.index < html.indexOf('href="styles.css"'));
  for (const scenario of [{ dark: false }, { dark: true }, { dark: true, saved: 'light' }, { dark: false, saved: 'dark' }, { dark: true, saved: 'invalid' }, { dark: true, blockedRead: true }]) {
    const document = { documentElement: { dataset: {}, style: {} } };
    runInNewContext(match[1], { document, localStorage: { getItem() { if (scenario.blockedRead) throw new Error('Denied'); return scenario.saved; } }, matchMedia: () => ({ matches: scenario.dark }) });
    const state = setup(scenario);
    assert.equal(document.documentElement.dataset.theme, state.controller.current);
    assert.equal(document.documentElement.style.colorScheme, state.controller.current);
  }
});
