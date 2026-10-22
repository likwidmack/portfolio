<style lang="scss" scoped>
@use 'globals/mixins' as mx;

.media-drawer {
  position: sticky;
  top: 1rem;
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  padding: 1.25rem;
  border: 1px solid var(--theme-border-color);
  border-radius: 1rem;
  background: var(--theme-surface-color, transparent);

  // Wide screens: the sticky panel never runs past the viewport, so its own controls stay reachable.
  @include mx.bp-up(standard) {
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  // Phones and tablets: a full-screen sheet over the grid, not a panel far below it.
  @include mx.bp-down(standard) {
    position: fixed;
    inset: 0;
    z-index: 10;
    align-content: start;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-top: 0;
    border: 0;
    border-radius: 0;
    background: var(--theme-background-color);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;

    @include mx.bp-down(standard) {
      position: sticky;
      top: 0;
      z-index: 1;
      padding-block: 0.75rem;
      border-bottom: 1px solid var(--theme-border-color);
      background: var(--theme-background-color);
    }

    h2 {
      min-width: 0;
      margin: 0;
      overflow-wrap: anywhere;
      font-size: 1.15rem;
      // Filenames display exactly as stored (theme headings title-case by default).
      text-transform: none;

      &:focus-visible {
        outline: 2px solid var(--theme-focus-ring-color, currentColor);
        outline-offset: 2px;
      }
    }
  }

  &__preview,
  &__player {
    display: block;
    width: 100%;
    max-height: 60dvh;
    border-radius: 0.5rem;
    object-fit: contain;
  }

  &__player:focus-visible {
    outline: 2px solid var(--theme-focus-ring-color, currentColor);
    outline-offset: 2px;
  }

  &__facts-panel {
    display: grid;
    justify-items: center;
    gap: 0.25rem;
    padding: 1.25rem 1rem;
    border-radius: 0.5rem;
    background: var(--theme-surface-variant-color);
    text-align: center;

    p {
      margin: 0;
      overflow-wrap: anywhere;
    }
  }

  &__facts {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.25rem 0.75rem;
    margin: 0;
    font-size: 0.9rem;

    dd {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
      min-width: 0;
      margin: 0;
    }
  }

  /* Keys and URLs are long and unbroken: wrap them so the drawer never scrolls sideways. */
  &__path {
    min-width: 0;
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }

  &__open {
    @include mx.touch-target;
    gap: 0.25rem;
    padding-inline: 0.5rem;
    color: var(--theme-link-color);

    &:focus-visible {
      outline: 2px solid var(--theme-focus-ring-color, currentColor);
      outline-offset: 2px;
    }
  }

  &__copy-status {
    margin: 0;
    font-size: 0.9rem;

    // Hidden, not removed, while empty: a live region must exist before its text changes.
    &:empty {
      @include mx.sr-only;
    }

    &[data-tone='success'] {
      color: var(--theme-success-ink-color, inherit);
    }

    &[data-tone='error'] {
      color: var(--theme-error-ink-color, inherit);
    }
  }

  h3 {
    margin: 0.5rem 0 0;
    font-size: 0.95rem;
  }

  &__tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      min-height: var(--touch-target, 44px);
      padding-inline: 0.5rem 0.15rem;
      border: 1px solid var(--theme-border-color);
      border-radius: 0.25rem;
    }
  }

  &__tag-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem;
    align-items: end;

    label {
      grid-column: 1 / -1;
    }
  }

  &__label {
    font-weight: 600;
  }
}

.sr-only {
  @include mx.sr-only;
}
</style>
