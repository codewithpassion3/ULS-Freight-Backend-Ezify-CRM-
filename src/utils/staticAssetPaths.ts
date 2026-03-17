import { join } from "path";
import { ENV } from "src/common/constants/env";
import { getEnv } from "./getEnv";

 export const statiAssetPaths = [
    {
      path: join(process.cwd(), "assets/images"),
      prefix: getEnv(ENV.STATIC_ASSETS_PREFIX),
    },
    {
      path: join(process.cwd(), "uploads"),
      prefix: getEnv(ENV.STATIC_ASSETS_UPLOAD_PREFIX),
    }
];