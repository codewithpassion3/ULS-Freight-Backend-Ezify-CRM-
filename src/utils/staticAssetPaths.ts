import { join } from "path";

 export const statiAssetPaths = [
    {
      path: join(process.cwd(), "assets/images"),
      prefix: process.env.STATIC_ASSETS_PREFIX || "/assets/images/",
    },
    {
      path: join(process.cwd(), "uploads"),
      prefix: process.env.STATIC_ASSETS_UPLOAD_PREFIX || "/uploads/",
    }
];