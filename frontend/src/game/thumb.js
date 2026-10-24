/** A Wikimedia thumbnail URL at 500px (they serve stepped widths); the board's 1920px is too heavy for a plate. Other URLs pass through. */
export const thumb = (src) => src.replace(/(\/thumb\/.*\/)\d+px-/, '$1500px-')
