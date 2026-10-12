import { entryParts } from '../utils/format'

// Logged lifts grouped by muscle group, with sets x reps as big scoreboard numbers.
export default function EntryGroups({ muscleGroups, entries }) {
  return (
    <div>
      <p className="legend">Read each score as sets × reps.</p>
      <div className="lifts">
        {muscleGroups.map((group) => {
          const items = entries.filter((e) => e.muscleGroup === group)
          return (
            <section className="lift-group" key={group}>
              <h2 className="lift-group-title">{group}</h2>
              {items.length === 0 ? (
                <p className="lift lift-empty">Nothing logged.</p>
              ) : (
                items.map((e) => {
                  const p = entryParts(e)
                  return (
                    <div className="lift" key={e.id}>
                      <span className="lift-name">{p.name}</span>
                      <span className="lift-score">
                        <span className="lift-scheme">{p.scheme}</span>
                        {p.weight && <span className="lift-weight">{p.weight}</span>}
                      </span>
                    </div>
                  )
                })
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}