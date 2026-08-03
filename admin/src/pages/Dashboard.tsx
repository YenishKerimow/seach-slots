import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { SEARCHINGS, formatDate, formatDateTime } from '../api';
import type { Searching, SearchingStatus } from '../api';
import { Card, StatusBadge, TypeBadge } from '../components/ui';

const STAT_META: { key: SearchingStatus | 'ALL'; label: string; color: string }[] =
  [
    { key: 'ALL', label: 'Всего', color: '#4f46e5' },
    { key: 'INPROGRESS', label: 'В процессе', color: '#f59e0b' },
    { key: 'FOUND', label: 'Найдено', color: '#10b981' },
    { key: 'CANCELED', label: 'Отменено', color: '#94a3b8' },
  ];

export default function Dashboard() {
  const { data, loading, error, refetch } = useQuery<{
    searchings: Searching[];
  }>(SEARCHINGS, { fetchPolicy: 'cache-and-network' });

  const rows = data?.searchings ?? [];
  const counts = {
    ALL: rows.length,
    INPROGRESS: rows.filter((r) => r.status === 'INPROGRESS').length,
    FOUND: rows.filter((r) => r.status === 'FOUND').length,
    CANCELED: rows.filter((r) => r.status === 'CANCELED').length,
  };

  const recentFound = [...rows]
    .filter((r) => r.status === 'FOUND')
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Дашборд</h1>
          <div className="sub">Обзор поисков слотов на приём</div>
        </div>
        <button className="btn" onClick={() => refetch()} disabled={loading}>
          {loading ? 'Обновление…' : '↻ Обновить'}
        </button>
      </header>

      <div className="content">
        {error && <div className="alert">Ошибка: {error.message}</div>}

        <div className="stats">
          {STAT_META.map((s) => (
            <div className="stat" key={s.key}>
              <div className="label">
                <span className="dot" style={{ background: s.color }} />
                {s.label}
              </div>
              <div className="value">{counts[s.key]}</div>
            </div>
          ))}
        </div>

        <Card
          title="Недавно найденные"
          actions={<Link className="btn sm" to="/searchings">Все поиски</Link>}
        >
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Дата слота</th>
                  <th>Тип</th>
                  <th>Статус</th>
                  <th>Найдено</th>
                </tr>
              </thead>
              <tbody>
                {recentFound.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.date)}</td>
                    <td>
                      <TypeBadge type={r.type} />
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="muted">{formatDateTime(r.updatedAt)}</td>
                  </tr>
                ))}
                {recentFound.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty">
                      Найденных слотов пока нет. Здесь появятся совпадения по
                      мере их нахождения скрапером.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
