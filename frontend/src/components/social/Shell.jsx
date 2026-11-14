import { useStrings } from '../../i18n.js'
import { PATHS } from '../../social/avatars.js'
import { ROOMS } from '../../social/username.js'
import { AppShell } from '../layout/AppShell.jsx'
import { menuSlots } from '../layout/menuSlots.jsx'
import styles from './social.module.css'

// The plan, in a 420 x 320 drawing: [x, y, width, height] of each room. Every wall between two rooms has a door gap.
const BOX = { hall: [20, 170, 130, 130], archive: [150, 170, 130, 130], studio: [280, 170, 120, 130], gallery: [20, 20, 210, 150], salon: [230, 20, 170, 150] }
const WALLS = 'M20 170H84M122 170H294M332 170H400M150 170V214M150 250V300M280 170V224M280 260V300M230 20V70M230 106V170'
const roomHref = (room) => (room === 'hall' ? '#/profile' : `#/profile/${room}`)

/** What a counting badge shows on its hook: the number to reach; an era badge shows a diamond. */
const hookText = (badge) => (!badge || badge.kind === 'era' ? '◆' : badge.rule === 'all' || badge.threshold >= 1000 ? '%' : String(badge.threshold))
const HOOKS = 7
const SEATS = [[283, 74], [347, 74], [283, 120], [347, 120]]

/**
 * The signed-in player's profile as a furnished floor plan: what each room holds is drawn in it (badges on
 * the Gallery wall, friends at the Salon table with requests waiting at the door, shelves in the Archive, an
 * open challenge on the Studio board). Each room is a link to its part; `data` is from usePlanData (null: empty rooms).
 */
export function Plan({ room, profile, data }) {
  const { plan: t } = useStrings()
  const earned = data?.earned ?? []
  const total = data?.catalogue.length ?? 0
  const friends = data?.friends.friends ?? []
  const waiting = data?.friends.incoming.length ?? 0
  const sheets = data?.card?.stats.unlocked ?? 0
  const open = data?.open ?? 0
  const books = Math.min(9, Math.ceil(sheets / 10))
  const captions = { hall: profile.username, archive: t.sheets(sheets), gallery: t.hung(earned.length, total - earned.length), salon: t.seated(friends.length, waiting), studio: t.board(open) }
  const furniture = {
    hall: (
      <>
        <circle cx="85" cy="232" r="20" className={styles.planFill} />
        <path transform="translate(73 220)" d={PATHS[profile.avatar] ?? PATHS.arch} className={styles.planLine} />
      </>
    ),
    archive: (
      <>
        <path className={styles.planThin} d="M166 232H264M166 246H264M166 260H264" />
        {Array.from({ length: books }, (_, i) => (
          <path key={i} className={styles.planBook} d={`M${172 + i * 9} 232v-${8 + ((i * 5) % 9)}`} />
        ))}
      </>
    ),
    gallery: Array.from({ length: HOOKS }, (_, i) => {
      const badge = earned[i] && data.catalogue.find((b) => b.id === earned[i].id)
      const [x, y] = [46 + i * 27, 62 + (i % 2) * 34]
      return (
        <g key={i} className={earned[i] ? styles.planHung : styles.planHook}>
          <circle cx={x} cy={y} r="11" />
          {earned[i] && (
            <text x={x} y={y + 3} textAnchor="middle">
              {hookText(badge)}
            </text>
          )}
        </g>
      )
    }),
    salon: (
      <>
        <ellipse className={styles.planThin} cx="315" cy="97" rx="22" ry="14" />
        {SEATS.map(([x, y], i) =>
          friends[i] ? (
            <g key={i} className={styles.planSeat}>
              <circle cx={x} cy={y} r="9" />
              <text x={x} y={y + 3} textAnchor="middle">
                {friends[i].username[0]}
              </text>
            </g>
          ) : null,
        )}
        {waiting > 0 && (
          <g className={styles.planHook}>
            <circle cx="313" cy="152" r="8" />
          </g>
        )}
      </>
    ),
    studio: (
      <>
        <rect className={styles.planThin} x="296" y="212" width="44" height="26" />
        {open > 0 && <path className={styles.planMark} d="M302 220h30M302 226h22M302 232h26" />}
        <rect className={styles.planHook} x="346" y="248" width="40" height="22" />
      </>
    ),
  }
  return (
    <div className={styles.plan}>
      <p className={styles.label}>{t.caption}</p>
      <svg viewBox="0 0 420 320" role="group" aria-label={t.label}>
        {ROOMS.map((id) => {
          const [x, y, w, h] = BOX[id]
          return (
            <a key={id} href={roomHref(id)} className={styles.planRoom} aria-current={room === id ? 'page' : undefined} aria-label={`${t.rooms[id]}: ${t.parts[id]}. ${captions[id]}`} data-sound="toggle">
              <rect className={styles.planHit} x={x} y={y} width={w} height={h} />
              <text className={styles.planName} x={x + 12} y={y + 20}>
                {t.rooms[id]}
              </text>
              {furniture[id]}
              <text className={styles.planNote} x={x + 12} y={y + h - 12}>
                {captions[id]}
              </text>
            </a>
          )
        })}
        <path className={styles.planPoche} d="M20 20H400V300H20Z" />
        <path className={styles.planEntry} d="M64 300h32" />
        <path className={styles.planWall} d={WALLS} />
      </svg>
      {/* The same rooms as plain links: easier to tap, and the names of the parts. */}
      <nav className={styles.chips} aria-label={t.nav}>
        {ROOMS.map((id) => (
          <a key={id} href={roomHref(id)} aria-current={room === id ? 'page' : undefined}>
            {t.parts[id]}
          </a>
        ))}
      </nav>
    </div>
  )
}

/**
 * The frame every account screen shares: the slim header and one centred column. With `plan` (the
 * signed-in player's own rooms) the plan sits beside the content on wide screens and above it on narrow ones.
 */
export function SocialShell({ plan = null, children }) {
  const strings = useStrings()
  return (
    <AppShell place={strings.account.place} slim {...menuSlots(strings.menu)}>
      {plan ? (
        <div className={styles.rooms}>
          {plan}
          <div className={styles.page}>{children}</div>
        </div>
      ) : (
        <div className={styles.page}>{children}</div>
      )}
    </AppShell>
  )
}

/** A short message in place of a screen (accounts off, still loading, nothing to show). */
export function Notice({ children }) {
  const { account: t } = useStrings()
  return (
    <section className={styles.sheet}>
      <p role="status">{children}</p>
      <a className={styles.link} href="#/">
        {t.home}
      </a>
    </section>
  )
}
