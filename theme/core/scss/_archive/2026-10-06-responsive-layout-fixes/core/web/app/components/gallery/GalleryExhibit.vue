<style lang="scss" scoped>
.gallery-exhibit {
  position: relative;
  display: grid;
  min-height: 16rem;
  // Clip media/shell only — code frames need a visible outward focus ring (2px offset).
  overflow: visible;
  background: color-mix(in srgb, var(--theme-surface-color) 70%, transparent);

  &:not([data-kind='code']) {
    overflow: hidden;
  }

  &__image,
  &__video {
    width: 100%;
    height: 100%;
    min-height: 16rem;
    object-fit: cover;
  }

  &__image {
    display: block;
  }

  // The video fills the exhibit (the gallery tile sizes the exhibit). UiImage's photo already
  // covers its frame — no reaching into it.
  video {
    min-height: 0;
    max-width: 100%;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__series {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 1.25rem;
    list-style: none;

    li {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding-block: 0.35rem;
      border-bottom: 1px solid var(--portfolio-rule-color, currentColor);
    }
  }

  &__caption,
  &__fallback {
    @include portfolio-type-meta;
    margin: 0;
    padding: 0.65rem 0.85rem;
    font-size: 0.85rem;
    letter-spacing: 0.02em;
  }

  &__caption {
    position: absolute;
    inset: auto 0.65rem 0.65rem;
    border-radius: 0.55rem;
    background: color-mix(in srgb, var(--theme-surface-color) 78%, transparent);
    backdrop-filter: blur(4px);
  }
}
</style>
