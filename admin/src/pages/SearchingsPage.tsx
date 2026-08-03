import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CREATE_SEARCHINGS,
  REMOVE_SEARCHING,
  REMOVE_SEARCHINGS,
  SEARCHINGS,
  STATUSES,
  STATUS_LABELS,
  TYPES,
  TYPE_LABELS,
  UPDATE_STATUS,
  formatDate,
  formatDateTime,
} from '../api';
import type { Searching, SearchingStatus, SearchingType } from '../api';
import { Card, StatusBadge, TypeBadge } from '../components/ui';
import Modal from '../components/Modal';

export default function SearchingsPage() {
  const { data, loading, error, refetch } = useQuery<{
    searchings: Searching[];
  }>(SEARCHINGS, { fetchPolicy: 'cache-and-network' });

  const [createSearchings, { loading: creating, error: createError }] =
    useMutation(CREATE_SEARCHINGS);
  const [updateStatus] = useMutation(UPDATE_STATUS);
  const [removeSearching] = useMutation(REMOVE_SEARCHING);
  const [removeSearchings, { loading: bulkDeleting }] =
    useMutation(REMOVE_SEARCHINGS);

  // Multi-select for bulk delete
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Create modal + form
  const [modalOpen, setModalOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState<SearchingType>('USUAL');

  // Filters
  const [statusFilter, setStatusFilter] = useState<SearchingStatus | 'ALL'>(
    'ALL',
  );
  const [typeFilter, setTypeFilter] = useState<SearchingType | 'ALL'>('ALL');

  const rows = useMemo(() => {
    const all = data?.searchings ?? [];
    return all
      .filter((r) => statusFilter === 'ALL' || r.status === statusFilter)
      .filter((r) => typeFilter === 'ALL' || r.type === typeFilter)
      .slice()
      // Newest first — sort by creation date descending.
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [data, statusFilter, typeFilter]);

  const visibleIds = useMemo(() => rows.map((r) => r.id), [rows]);

  // Drop selected ids that are no longer visible (filtered out / deleted).
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(visibleIds);
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds]);

  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(visibleIds));

  const onBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Удалить выбранные поиски (${selected.size})?`)) return;
    await removeSearchings({ variables: { ids: [...selected] } });
    setSelected(new Set());
    await refetch();
  };

  const openModal = () => {
    setFrom('');
    setTo('');
    setType('USUAL');
    setModalOpen(true);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) return;
    await createSearchings({
      variables: {
        input: {
          dates: {
            from: new Date(from).toISOString(),
            to: new Date(to).toISOString(),
          },
          type,
        },
      },
    });
    setModalOpen(false);
    await refetch();
  };

  const onSetStatus = async (id: string, status: SearchingStatus) => {
    await updateStatus({ variables: { id, status } });
    await refetch();
  };

  const onRemove = async (id: string) => {
    if (!confirm('Удалить этот поиск?')) return;
    await removeSearching({ variables: { id } });
    await refetch();
  };

  const activeFilters = statusFilter !== 'ALL' || typeFilter !== 'ALL';

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Поиски</h1>
          <div className="sub">Создавайте и управляйте поисками слотов по дням</div>
        </div>
        <div className="toolbar">
          <button className="btn" onClick={() => refetch()} disabled={loading}>
            {loading ? 'Обновление…' : '↻ Обновить'}
          </button>
          <button className="btn primary" onClick={openModal}>
            + Создать поиск
          </button>
        </div>
      </header>

      <div className="content">
        <Card
          title={`Все поиски (${rows.length})`}
          actions={
            <div className="toolbar">
              {selected.size > 0 && (
                <>
                  <span className="muted" style={{ fontSize: 13 }}>
                    Выбрано: {selected.size}
                  </span>
                  <button
                    className="btn danger sm"
                    onClick={onBulkDelete}
                    disabled={bulkDeleting}
                  >
                    {bulkDeleting
                      ? 'Удаление…'
                      : `🗑 Удалить выбранные (${selected.size})`}
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={() => setSelected(new Set())}
                  >
                    Снять выделение
                  </button>
                </>
              )}
              <select
                className="select"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as SearchingStatus | 'ALL')
                }
              >
                <option value="ALL">Все статусы</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as SearchingType | 'ALL')
                }
              >
                <option value="ALL">Все типы</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              {activeFilters && (
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setTypeFilter('ALL');
                  }}
                >
                  Сбросить
                </button>
              )}
            </div>
          }
        >
          {error && (
            <div className="card-body">
              <div className="alert">Ошибка: {error.message}</div>
            </div>
          )}
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Выбрать все"
                    />
                  </th>
                  <th>Дата слота</th>
                  <th>Тип</th>
                  <th>Статус</th>
                  <th>Создан</th>
                  <th style={{ textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={selected.has(r.id) ? 'row-selected' : undefined}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                        aria-label="Выбрать поиск"
                      />
                    </td>
                    <td>{formatDate(r.date)}</td>
                    <td>
                      <TypeBadge type={r.type} />
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="muted">{formatDateTime(r.createdAt)}</td>
                    <td>
                      <div className="actions">
                        {r.status !== 'INPROGRESS' && (
                          <button
                            className="btn ghost sm"
                            onClick={() => onSetStatus(r.id, 'INPROGRESS')}
                          >
                            Возобновить
                          </button>
                        )}
                        {r.status === 'INPROGRESS' && (
                          <button
                            className="btn ghost sm"
                            onClick={() => onSetStatus(r.id, 'CANCELED')}
                          >
                            Отменить
                          </button>
                        )}
                        <button
                          className="btn danger sm"
                          onClick={() => onRemove(r.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      {activeFilters
                        ? 'Нет поисков по выбранным фильтрам.'
                        : 'Поисков пока нет — создайте первый.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        title="Новый поиск"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setModalOpen(false)}>
              Отмена
            </button>
            <button
              className="btn primary"
              type="submit"
              form="create-searching-form"
              disabled={creating}
            >
              {creating ? 'Создание…' : 'Создать'}
            </button>
          </>
        }
      >
        <form id="create-searching-form" className="stack" onSubmit={onCreate}>
          <div className="grid-2">
            <div className="field">
              <label>С даты</label>
              <input
                className="input"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>По дату</label>
              <input
                className="input"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="field">
            <label>Тип</label>
            <select
              className="select"
              value={type}
              onChange={(e) => setType(e.target.value as SearchingType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            На каждый день из диапазона (включительно) создаётся отдельный поиск.
          </p>
          {createError && <div className="alert">{createError.message}</div>}
        </form>
      </Modal>
    </>
  );
}
