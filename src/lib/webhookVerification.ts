import crypto from 'crypto'

export function verifyCloudflareWebhookSignature(
  signature: string,
  body: string,
  secret: string
): boolean {
  try {
    // Parse the signature header
    // Format: "time=1230811200,sig1=60493ec9388b44585a29543bcf0de62e377d4da393246a8b1c901d0e3e672404"
    const parts = signature.split(',')
    const timePart = parts.find(p => p.startsWith('time='))
    const sigPart = parts.find(p => p.startsWith('sig1='))
    
    if (!timePart || !sigPart) {
      console.error('Invalid signature format')
      return false
    }
    
    const timestamp = timePart.split('=')[1]
    const receivedSignature = sigPart.split('=')[1]
    
    // Check if timestamp is too old (5 minutes)
    const currentTime = Math.floor(Date.now() / 1000)
    const requestTime = parseInt(timestamp)
    if (currentTime - requestTime > 300) { // 5 minutes
      console.error('Webhook signature too old')
      return false
    }
    
    // Create the signature source string: timestamp + "." + body
    const sourceString = timestamp + '.' + body
    
    // Create the expected signature using HMAC-SHA256
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(sourceString)
    const expectedSignature = hmac.digest('hex')
    
    // Compare signatures (constant-time comparison)
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}
