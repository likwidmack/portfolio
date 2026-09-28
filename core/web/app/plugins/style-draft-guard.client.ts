/**
 * App-level unload guard for Style Studio drafts. The draft keeps previewing site-wide after
 * the visitor leaves `/styles`, so the guard must outlive the Studio component: it watches the
 * shared `style-studio-draft-dirty` state for the whole session.
 */
export default defineNuxtPlugin(() => {
  const dirty = useState<boolean>('style-studio-draft-dirty', () => false);
  useUnsavedDraftGuard(dirty);
});
