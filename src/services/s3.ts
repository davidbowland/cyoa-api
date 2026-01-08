import { PutObjectCommand, PutObjectOutput, S3Client } from '@aws-sdk/client-s3'

import { s3AssetsBucket } from '../config'
import { StringObject } from '../types'
import { xrayCapture } from '../utils/logging'

const s3 = xrayCapture(new S3Client({ apiVersion: '2006-03-01' }))

export const putS3Object = async (
  key: string,
  body: Buffer | string,
  metadata: StringObject = {},
): Promise<PutObjectOutput> => {
  const command = new PutObjectCommand({
    Body: body,
    Bucket: s3AssetsBucket,
    Key: key,
    Metadata: metadata,
  })
  return s3.send(command)
}
