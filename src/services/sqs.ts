import { SendMessageCommand, SendMessageResult, SQSClient } from '@aws-sdk/client-sqs'

import { sqsMessageGroupId, sqsQueueUrl } from '../config'
import { StringObject } from '../types'
import { xrayCapture } from '../utils/logging'

const sqs = xrayCapture(new SQSClient({ apiVersion: '2012-11-05' }))

/* Message queue */

export const addToQueue = async (data: StringObject): Promise<SendMessageResult> => {
  const command = new SendMessageCommand({
    MessageBody: JSON.stringify(data),
    MessageDeduplicationId: data.uuid,
    MessageGroupId: sqsMessageGroupId,
    QueueUrl: sqsQueueUrl,
  })
  return sqs.send(command)
}
