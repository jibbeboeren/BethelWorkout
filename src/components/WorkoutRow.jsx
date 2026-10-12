import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge.jsx'
import { dateParts } from '../utils/format'

export default function WorkoutRow({ workout, to }) {
  const { month, day, weekday } = dateParts(workout.date)
  const done = workout.status === 'completed'

  return (
    <Link to={to} className="row">
      <span className={`date-tile${done ? '' : ' is-open'}`}>
        <span>{month}</span>
        <strong>{day}</strong>
      </span>
      <span className="row-body">
        <span className="row-title">{weekday}</span>
        <span className="row-sub">{workout.muscleGroups.join(', ')}</span>
      </span>
      <StatusBadge status={workout.status} />
    </Link>
  )
}