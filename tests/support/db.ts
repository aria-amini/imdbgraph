import { createDbTest } from '@aamini/config/vitest/db'

import { REQUIRED_EXTENSIONS } from '@/db/extensions'

/** Creates one migrated database per test file, shared by its tests. */
export const initDb = createDbTest({ extensions: REQUIRED_EXTENSIONS })
