export { createVeramoAgent, type VeramoAgent } from './agent'
export { createDID, resolveDID, getDIDDocument, didWebToUrl, resolveAnyDID, buildStudentDIDDocument, type DIDDocument } from './did'
export { createVC, verifyVC, type VCCreateOptions, type VCVerifyOptions, type VCVerifyResult } from './vc'
export { createVP, verifyVP, type VPCreateOptions, type VPVerifyOptions, type VPVerifyResult } from './vp'
export {
  createStatusList,
  buildStatusListCredential,
  getStatusListCredential,
  setRevoked,
  checkStatusAtIndex,
  isRevoked,
  type StatusListOptions,
  type StatusListCreateResult,
} from './status-list'
