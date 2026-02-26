// ── Push Notification Payloads ──────────────────────────

export type NotificationType =
  | 'consent_request'
  | 'consent_approved'
  | 'consent_denied'
  | 'vc_issued'
  | 'vc_revoked'
  | 'transfer_requested'
  | 'transfer_approved'
  | 'transfer_rejected'

export interface PushNotificationPayload {
  type: NotificationType
  title: string
  titleTH: string
  body: string
  bodyTH: string
  data: Record<string, string>
}

export interface ConsentRequestNotification extends PushNotificationPayload {
  type: 'consent_request'
  data: {
    consentId: string
    requesterNode: string
    requesterName: string
    purpose: string
  }
}

export interface VCIssuedNotification extends PushNotificationPayload {
  type: 'vc_issued'
  data: {
    vcId: string
    vcType: string
    courseId: string
    courseName: string
    issuerNode: string
  }
}

export interface TransferNotification extends PushNotificationPayload {
  type: 'transfer_requested' | 'transfer_approved' | 'transfer_rejected'
  data: {
    transferId: string
    sourceCourse: string
    targetCourse: string
    targetNode: string
    status: string
  }
}
