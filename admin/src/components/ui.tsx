import type {
  SearchingStatus,
  SearchingType,
  TicketSearchingStatus,
} from '../api';
import { STATUS_LABELS, TICKET_STATUS_LABELS, TYPE_LABELS } from '../api';

export function StatusBadge({ status }: { status: SearchingStatus }) {
  return (
    <span className={`badge status-${status}`}>
      <span className="dot" style={{ background: 'currentColor' }} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function TicketStatusBadge({
  status,
}: {
  status: TicketSearchingStatus;
}) {
  return (
    <span className={`badge status-${status}`}>
      <span className="dot" style={{ background: 'currentColor' }} />
      {TICKET_STATUS_LABELS[status]}
    </span>
  );
}

export function TypeBadge({ type }: { type: SearchingType }) {
  return <span className={`badge type-${type}`}>{TYPE_LABELS[type]}</span>;
}

export function Card({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      {(title || actions) && (
        <div className="card-head">
          {title ? <h2>{title}</h2> : <span />}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
