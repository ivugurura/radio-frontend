import { graphql } from '../generated';

export const REQUEST_UPLOAD = graphql(`
  mutation RequestUpload(
    $studioSlug: String!
    $fileName: String!
    $sizeBytes: Int!
    $mimeType: String!
    $checksumSha256: String
  ) {
    requestUpload(
      studioSlug: $studioSlug
      fileName: $fileName
      sizeBytes: $sizeBytes
      mimeType: $mimeType
      checksumSha256: $checksumSha256
    ) {
      uploadId
      chunkUrl
      uploadToken
      trackId
    }
  }
`);

export const FINALIZE_UPLOAD = graphql(`
  mutation FinalizeUpload($uploadId: UUID!, $checksumSha256: String) {
    finalizeUpload(uploadId: $uploadId, checksumSha256: $checksumSha256) {
      ok
      trackId
    }
  }
`);

export const DELETE_TRACK = graphql(`
  mutation DeleteTrack($trackId: UUID!) {
    deleteTrack(trackId: $trackId) {
      ok
    }
  }
`);
