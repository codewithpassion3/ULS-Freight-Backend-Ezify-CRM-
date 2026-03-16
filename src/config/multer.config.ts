import { diskStorage } from "multer";
import { BadRequestException } from "@nestjs/common";
import { extname } from "path";
import { sizeInMb, uploadImageDestination } from "src/common/constants/multer";

export const multerConfig = {
  storage: diskStorage({
    destination: uploadImageDestination,

    filename: (req, file, cb) => {
      const uniqueName =
        Date.now() + "-" + Math.round(Math.random() * 1e9);

      cb(null, uniqueName + extname(file.originalname));
    }
  }),

  limits: {
    fileSize: 2 * sizeInMb
  },

  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      return cb(
        new BadRequestException("Only image files allowed"),
        false
      );
    }

    cb(null, true);
  }
};