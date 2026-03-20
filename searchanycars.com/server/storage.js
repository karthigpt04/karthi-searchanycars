import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const uploadsDir = process.env.UPLOADS_DIR || 'uploads'
const uploadsRoot = path.resolve(process.cwd(), uploadsDir, 'listings')

const sanitizeName = (name) => name.toLowerCase().replace(/[^a-z0-9.-]/g, '-')

const getFileExtension = (originalName, contentType) => {
  const fromName = originalName.split('.').pop()?.trim().toLowerCase()
  if (fromName && fromName.length <= 8) {
    return fromName
  }

  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  if (contentType === 'image/gif') return 'gif'
  return 'jpg'
}

export const uploadImage = async ({ buffer, originalName, contentType }) => {
  const now = new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const extension = getFileExtension(originalName, contentType)
  const fileName = `${randomUUID()}-${sanitizeName(originalName || 'car-image')}.${extension}`
  const relativePath = path.join(yyyy, mm)
  const absoluteDir = path.join(uploadsRoot, relativePath)

  await fs.mkdir(absoluteDir, { recursive: true })
  await fs.writeFile(path.join(absoluteDir, fileName), buffer)

  const uploadPath = `/uploads/listings/${yyyy}/${mm}/${fileName}`

  return {
    url: uploadPath,
    path: uploadPath,
    fileName,
  }
}
