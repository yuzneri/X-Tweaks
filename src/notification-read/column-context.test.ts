import { test } from 'node:test';
import assert from 'node:assert/strict';
import { columnAccountIn } from './column-context.ts';

test('一致するカラム設定から代理アカウントだけを読む', () => {
  const tree = {
    wrapper: { columnId: 'column-1' },
    unrelated: { columnId: 'other', state: { actAsUserId: '999' } },
    wanted: {
      columnId: 'column-1',
      pathname: '/notifications',
      state: { actAsUserId: '456' },
    },
  };
  assert.deepEqual(columnAccountIn([tree], 'column-1', '123'), {
    accountId: '456',
    path: '/notifications',
  });
});

test('actAsUserIdが空または無い一致カラムは本人IDに対応する', () => {
  assert.deepEqual(
    columnAccountIn(
      [{ _columnId: 'column-1', _columnHistory: { location: { pathname: '/home', state: { actAsUserId: '' } } } }],
      'column-1',
      '123'
    ),
    { accountId: '123', path: '/home' }
  );
  assert.deepEqual(
    columnAccountIn([{ columnId: 'column-1', pathname: '/notifications' }], 'column-1', '123'),
    { accountId: '123', path: '/notifications' }
  );
  assert.equal(columnAccountIn([{ columnId: 'column-1' }], 'column-1', '123'), null);
  assert.equal(columnAccountIn([{ columnId: 'column-1', pathname: '/home' }], 'column-1', null), null);
});

test('同じカラムIDに複数アカウントが見つかった場合は失敗する', () => {
  assert.equal(
    columnAccountIn(
      [
        { columnId: 'column-1', state: { actAsUserId: '456' } },
        { _columnId: 'column-1', _actAsUserId: '789' },
      ],
      'column-1',
      '123'
    ),
    null
  );
  assert.equal(
    columnAccountIn(
      [
        {
          columnId: 'column-1',
          actAsUserId: '',
          state: { actAsUserId: '456' },
          pathname: '/notifications',
        },
      ],
      'column-1',
      '123'
    ),
    null
  );
});

test('循環参照とgetterを実行せずに探索する', () => {
  const root: Record<string, unknown> = {};
  root.self = root;
  Object.defineProperty(root, 'danger', {
    get() {
      throw new Error('must not run');
    },
  });
  root.child = { columnId: 'column-1', query: { actAsUserId: '456' } };
  assert.equal(columnAccountIn([root], 'column-1', '123')?.accountId, '456');
});
