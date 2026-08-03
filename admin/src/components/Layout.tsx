import { NavLink, Outlet } from 'react-router-dom';
import SlotNotifications from '../SlotNotifications';

const NAV = [
  { to: '/', label: 'Дашборд', ico: '▚', end: true },
  { to: '/searchings', label: 'Поиски', ico: '☰', end: false },
];

export default function Layout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <div className="title">TURK BRON</div>
            <div className="subtitle">Мониторинг слотов</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label">Меню</div>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <span className="ico">{item.ico}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          Скрапер работает каждые 30 сек · уведомляет в Telegram при совпадении.
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      <SlotNotifications />
    </div>
  );
}
