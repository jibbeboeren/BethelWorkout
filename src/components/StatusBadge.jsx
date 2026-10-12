export default function StatusBadge({ status }) {
  const done = status === 'completed'
  return (
    <span className={`badge ${done ? 'badge-completed' : 'badge-pending'}`}>
      {done ? 'Submitted' : 'Pending'}
    </span>
  )
}