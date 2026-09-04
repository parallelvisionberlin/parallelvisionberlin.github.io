import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../js/nina-admin.js', import.meta.url), 'utf8');

function dashboard() {
  const node = () => ({ children: [], textContent: '', append(...items) { this.children.push(...items); }, replaceChildren() { this.children = []; } });
  const sessions = node();
  const labels = [node(), node()];
  const buttons = ['previous', 'next', 'previous', 'next'].map(direction => ({
    dataset: { sessionPage: direction }, disabled: false,
    addEventListener(event, handler) { this.click = handler; }
  }));
  let scrolls = 0;
  const ctx = vm.createContext({
    elements: { sessions }, dateTime: value => value, duration: value => value,
    tableMessage: (container, columns, message) => container.append({ textContent: message }),
    document: {
      createElement: node,
      getElementById: () => ({ closest: () => ({ scrollIntoView: () => { scrolls++; } }) }),
      querySelectorAll: selector => selector.includes('status') ? labels
        : selector.includes('="previous"') ? buttons.filter(b => b.dataset.sessionPage === 'previous')
        : selector.includes('="next"') ? buttons.filter(b => b.dataset.sessionPage === 'next') : buttons
    }
  });
  vm.runInContext(source.slice(source.indexOf('const SESSION_PAGE_SIZE'), source.indexOf('async function loadClerkUI'))
    + source.slice(source.indexOf('function renderSessions('), source.indexOf('async function fetchDashboard()')), ctx);
  return { render: ctx.renderSessions, sessions, labels, buttons, scrolls: () => scrolls };
}

const fixtures = count => Array.from({ length: count }, (_, i) => ({ userIdentifier: `visitor-${i}`, startedAt: '2026-09-04', connectedSeconds: 90, status: 'ended' }));

test('30 sessions per page, synchronized controls, and selection survives refresh', () => {
  const d = dashboard();
  d.render(fixtures(65));
  assert.equal(d.sessions.children.length, 30);
  assert.equal(d.buttons[0].disabled, true);
  d.buttons[3].click();
  assert.equal(d.sessions.children.length, 30);
  assert.match(d.labels[0].textContent, /Page 2 of 3.*31–60/);
  assert.equal(d.labels[0].textContent, d.labels[1].textContent);
  d.render(fixtures(66));
  assert.match(d.labels[0].textContent, /Page 2 of 3/);
  assert.equal(d.scrolls(), 1);
  d.buttons[1].click();
  assert.equal(d.sessions.children.length, 6);
  assert.equal(d.buttons[1].disabled, true);
  assert.equal(d.buttons[3].disabled, true);
  d.buttons[2].click();
  assert.match(d.labels[0].textContent, /Page 2 of 3/);
});

test('empty and shortened results clamp safely; the API history limit is explicit', () => {
  const d = dashboard();
  d.render(fixtures(100));
  d.buttons[1].click(); d.buttons[1].click(); d.buttons[1].click();
  assert.equal(d.sessions.children.length, 10);
  assert.match(d.labels[0].textContent, /Page 4 of 4.*100 most recent sessions/);
  d.render(fixtures(12));
  assert.equal(d.sessions.children.length, 12);
  assert.match(d.labels[0].textContent, /Page 1 of 1/);
  d.render([]);
  assert.equal(d.sessions.children[0].textContent, 'No sessions yet.');
  assert.ok(d.buttons.every(button => button.disabled));
});
