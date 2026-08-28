/**
 * Shared selected database for admin CRUD (sqlite | postgres | dynamodb).
 */
import {
  ADMIN_DATABASE_LABELS,
  readAdminDatabase,
  writeAdminDatabase,
  type AdminDatabase,
} from '../utils/admin-database';

export const useAdminDatabase = () => {
  // Shared across nav selector + CRUD pages so a change reloads the active list.
  const selected = useState<AdminDatabase>('portfolio.adminDatabase', () => readAdminDatabase('sqlite'));

  const setDatabase = (database: AdminDatabase) => {
    selected.value = database;
    writeAdminDatabase(database); // keep sessionStorage in sync for adminRequestHeaders()
  };

  const label = computed(() => ADMIN_DATABASE_LABELS[selected.value]);

  onMounted(() => {
    // Hydrate from sessionStorage after client mount (useState default may run on server).
    selected.value = readAdminDatabase(selected.value);
  });

  return { selected, setDatabase, label };
};
