<style lang="scss" scoped>
.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.admin-post-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.admin-post-status {
  text-transform: uppercase;
  letter-spacing: 0.04em;

  &[data-status='draft'] {
    color: var(--text-color-secondary, inherit);
  }

  &[data-status='published'] {
    color: var(--theme-primary-color, inherit);
  }
}
</style>
