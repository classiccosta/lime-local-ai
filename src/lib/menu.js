// One look for every menu/popover; copied from assistant-ui's ActionBarMore (thread.jsx).
export const menuContent =
  'bg-popover text-popover-foreground z-50 min-w-32 overflow-hidden rounded-xl border p-1.5 ' +
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 ' +
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 ' +
  'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 ' +
  'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2';
export const menuItem =
  'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none ' +
  'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground';
