import { YOUTUBE_PATTERN } from '../utils/format'

// A student typed this link, so it only becomes clickable if it looks like YouTube.
export default function VideoLink({ url, label = 'Watch video', primary = false }) {
  if (url && YOUTUBE_PATTERN.test(url)) {
    return (
      <a
        className={`btn btn-block ${primary ? 'btn-primary' : 'btn-plain'}`}
        href={url}
        target="_blank"
        rel="noreferrer"
      >
        {label}
      </a>
    )
  }

  return <p className="hint">This isn't a YouTube link, so it can't be opened here: {url || 'none'}</p>
}