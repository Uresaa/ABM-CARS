import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

export const homepageSnapshotPath =
  process.env.CACHE_SNAPSHOT_PATH || join(tmpdir(), "abm-cars", "homepage.json");

export const carCachePath = join(dirname(homepageSnapshotPath), "cars.json");
