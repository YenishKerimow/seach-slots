import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CABIN_LABELS,
  CREATE_TICKET_SEARCHINGS,
  REMOVE_TICKET_SEARCHING,
  REMOVE_TICKET_SEARCHINGS,
  TICKET_CLASSES,
  TICKET_CLASS_LABELS,
  TICKET_SEARCHINGS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  UPDATE_TICKET_CLASS,
  UPDATE_TICKET_STATUS,
  formatDate,
  formatDateTime,
} from '../api';
import type {
  TicketClass,
  TicketSearching,
  TicketSearchingStatus,
} from '../api';
import { Card, TicketStatusBadge } from '../components/ui';
import Modal from '../components/Modal';

/** Found searchings keep being checked until canceled or deleted. */
const isActive = (status: TicketSearchingStatus) =>
  status === 'INPROGRESS' || status === 'FOUND';

export default function TicketsPage() {
  // Poll so statuses / found flights from the worker show up without a reload.
  const { data, loading, error, refetch } = useQuery<{
    ticketSearchings: TicketSearching[];
  }>(TICKET_SEARCHINGS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
  });

  const [createSearchings, { loading: creating, error: createError }] =
    useMutation(CREATE_TICKET_SEARCHINGS);
  const [updateStatus] = useMutation(UPDATE_TICKET_STATUS);
  const [updateClass] = useMutation(UPDATE_TICKET_CLASS);
  const [removeSearching] = useMutation(REMOVE_TICKET_SEARCHING);
  const [removeSearchings, { loading: bulkDeleting }] = useMutation(
    REMOVE_TICKET_SEARCHINGS,
  );

  // Multi-select for bulk delete
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Create modal + form
  const [modalOpen, setModalOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [ticketClass, setTicketClass] = useState<TicketClass>('BOTH');

  // Filters
  const [statusFilter, setStatusFilter] = useState<
    TicketSearchingStatus | 'ALL'
  >('ALL');
  const [classFilter, setClassFilter] = useState<TicketClass | 'ALL'>('ALL');

  const rows = useMemo(() => {
    const all = data?.ticketSearchings ?? [];
    return all
      .filter((r) => statusFilter === 'ALL' || r.status === statusFilter)
      .filter((r) => classFilter === 'ALL' || r.ticketClass === classFilter)
      .slice()
      // Newest first — sort by creation date descending.
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [data, statusFilter, classFilter]);

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
    if (!confirm(`Удалить выбранные поиски билетов (${selected.size})?`)) return;
    await removeSearchings({ variables: { ids: [...selected] } });
    setSelected(new Set());
    await refetch();
  };

  const openModal = () => {
    setFrom('');
    setTo('');
    setTicketClass('BOTH');
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
          ticketClass,
        },
      },
    });
    setModalOpen(false);
    await refetch();
  };

  const onSetStatus = async (id: string, status: TicketSearchingStatus) => {
    await updateStatus({ variables: { id, status } });
    await refetch();
  };

  const onSetClass = async (id: string, value: TicketClass) => {
    await updateClass({ variables: { id, ticketClass: value } });
  };

  const onRemove = async (id: string) => {
    if (!confirm('Удалить этот поиск билетов?')) return;
    await removeSearching({ variables: { id } });
    await refetch();
  };

  const activeFilters = statusFilter !== 'ALL' || classFilter !== 'ALL';

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Поиск билетов</h1>
          <div className="sub">
            Авиабилеты Ашхабад → Стамбул (Turkmenistan Airlines) по дням
          </div>
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
          title={`Все поиски билетов (${rows.length})`}
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
                  setStatusFilter(
                    e.target.value as TicketSearchingStatus | 'ALL',
                  )
                }
              >
                <option value="ALL">Все статусы</option>
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TICKET_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={classFilter}
                onChange={(e) =>
                  setClassFilter(e.target.value as TicketClass | 'ALL')
                }
              >
                <option value="ALL">Все классы</option>
                {TICKET_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {TICKET_CLASS_LABELS[c]}
                  </option>
                ))}
              </select>
              {activeFilters && (
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setClassFilter('ALL');
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
                  <th>Дата вылета</th>
                  <th>Класс</th>
                  <th>Статус</th>
                  <th>Найденные рейсы</th>
                  <th>Последняя проверка</th>
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
                      <select
                        className="select sm"
                        value={r.ticketClass}
                        onChange={(e) =>
                          onSetClass(r.id, e.target.value as TicketClass)
                        }
                        aria-label="Класс поиска"
                      >
                        {TICKET_CLASSES.map((c) => (
                          <option key={c} value={c}>
                            {TICKET_CLASS_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <TicketStatusBadge status={r.status} />
                    </td>
                    <td>
                      {r.foundFlights?.length ? (
                        <div className="flight-list">
                          {r.foundFlights.map((f) => (
                            <span
                              key={`${f.flightNumber}-${f.departureTime}-${f.cabinClass}`}
                            >
                              <b>{f.flightNumber}</b> {f.departureTime} →{' '}
                              {f.arrivalTime} · {CABIN_LABELS[f.cabinClass]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="muted" title={r.lastError ?? undefined}>
                      {r.lastCheckedAt ? formatDateTime(r.lastCheckedAt) : '—'}
                      {r.checksCount > 0 && ` · ${r.checksCount}×`}
                      {r.lastError && ' ⚠'}
                    </td>
                    <td className="muted">{formatDateTime(r.createdAt)}</td>
                    <td>
                      <div className="actions">
                        {!isActive(r.status) && (
                          <button
                            className="btn ghost sm"
                            onClick={() => onSetStatus(r.id, 'INPROGRESS')}
                          >
                            Возобновить
                          </button>
                        )}
                        {isActive(r.status) && (
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
                    <td colSpan={8} className="empty">
                      {activeFilters
                        ? 'Нет поисков по выбранным фильтрам.'
                        : 'Поисков билетов пока нет — создайте первый.'}
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
        title="Новый поиск билетов"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setModalOpen(false)}>
              Отмена
            </button>
            <button
              className="btn primary"
              type="submit"
              form="create-ticket-searching-form"
              disabled={creating}
            >
              {creating ? 'Создание…' : 'Создать'}
            </button>
          </>
        }
      >
        <form
          id="create-ticket-searching-form"
          className="stack"
          onSubmit={onCreate}
        >
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
            <label>Класс</label>
            <select
              className="select"
              value={ticketClass}
              onChange={(e) => setTicketClass(e.target.value as TicketClass)}
            >
              {TICKET_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {TICKET_CLASS_LABELS[c]}
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
