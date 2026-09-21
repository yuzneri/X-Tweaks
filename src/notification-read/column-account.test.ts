import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  columnSetKeyOf,
  resolveNotificationAccount,
  type NotificationColumnAccount,
} from './column-account.ts';

const column = (
  columnId: string,
  accountId: string | null,
  hasNotifications = true
): NotificationColumnAccount => ({ columnId, accountId, hasNotifications });

test('Reactから解決済みの通知カラムはそのアカウントを使う', () => {
  assert.equal(resolveNotificationAccount([column('a', '123')], 'a', ['456']), '123');
});

test('唯一の未解決通知カラムへ唯一の未割当通信アカウントを対応付ける', () => {
  assert.equal(
    resolveNotificationAccount(
      [column('known', '123'), column('target', null), column('other', null, false)],
      'target',
      ['123', '456']
    ),
    '456'
  );
});

test('未解決通知カラムが複数なら推測しない', () => {
  assert.equal(
    resolveNotificationAccount([column('target', null), column('other', null)], 'target', ['123']),
    null
  );
});

test('未割当通信アカウントが複数または無ければ推測しない', () => {
  const columns = [column('known', '123'), column('target', null)];
  assert.equal(resolveNotificationAccount(columns, 'target', ['123', '456', '789']), null);
  assert.equal(resolveNotificationAccount(columns, 'target', ['123']), null);
});

test('通知を持たないカラム、重複ID、不正なIDを対象にしない', () => {
  assert.equal(resolveNotificationAccount([column('target', null, false)], 'target', ['123']), null);
  assert.equal(
    resolveNotificationAccount([column('target', null), column('target', '123')], 'target', ['123']),
    null
  );
  assert.equal(resolveNotificationAccount([column('target', null)], 'target', ['self']), null);
});

test('カラム集合キーは順序に依存せず、不明または重複IDを拒否する', () => {
  assert.equal(
    columnSetKeyOf([column('b', null), column('a', '123', false)]),
    columnSetKeyOf([column('a', '123', false), column('b', null)])
  );
  assert.equal(columnSetKeyOf([{ columnId: null, accountId: null, hasNotifications: true }]), null);
  assert.equal(columnSetKeyOf([column('a', null), column('a', '123')]), null);
});
