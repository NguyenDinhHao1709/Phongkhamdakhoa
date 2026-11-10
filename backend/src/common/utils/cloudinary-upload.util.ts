import { BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

/** Upload buffer lên Cloudinary, trả về secure_url (lưu bền, không mất khi deploy lại) */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'raw',
  publicId?: string,
): Promise<string> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new BadRequestException('Chưa cấu hình Cloudinary trên backend');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    return await new Promise<string>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder, resource_type: resourceType, public_id: publicId }, (error, result) => {
          if (error || !result?.secure_url) return reject(error || new Error('Cloudinary không trả về URL'));
          resolve(result.secure_url);
        })
        .end(buffer);
    });
  } catch (error: any) {
    throw new BadRequestException(`Không thể tải tệp lên: ${error?.message || 'lỗi Cloudinary'}`);
  }
}
