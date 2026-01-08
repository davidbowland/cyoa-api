import AWSXRay from 'aws-xray-sdk-core'

import { debugLogging } from '../config'

export const log = (...args: unknown[]): unknown => console.log(...args)

export const logDebug = (...args: unknown[]): unknown =>
  debugLogging ? console.log(...args) : undefined

export const logError = (...args: unknown[]): unknown => console.error(...args)

export const xrayCapture = (x: any): any =>
  process.env.AWS_SAM_LOCAL === 'true' ? x : AWSXRay.captureAWSv3Client(x)
