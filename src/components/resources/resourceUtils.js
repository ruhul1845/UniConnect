// Backward-compatible exports for older imports. New code should use
// resourceConstants.js and resourceHelpers.js directly.
export { RESOURCE_TYPES as resourceTypes, DEFAULT_UPLOAD_FORM as emptyUpload } from './resourceConstants';
export {
  buildResourcePayload,
  filterResources,
  normalizeResourceType as normalizeResource,
  uploadResourceFile,
  validateResourceUpload,
} from './resourceHelpers';
