# RFC 0022 — Storage migration (Supabase Storage → S3 / MinIO)

| Field      | Value                                                            |
| ---------- | ---------------------------------------------------------------- |
| Status     | Draft (stub)                                                     |
| Author     | Hani Chalouati                                                   |
| Created    | 2026-04-14                                                       |
| Target     | Phase 1 — replace Supabase Storage (1 bucket, avatars) with S3   |
| Supersedes | —                                                                |
| Related    | 0011, 0012                                                       |

## 1. Summary

Replace Supabase Storage with S3 (managed) or MinIO (on-prem) for the single `account_image` bucket used for user avatars. Fully independent of the auth migration; can ship in any order.

Phase 1 ships:

- S3 bucket per environment (prod, staging) + MinIO container for local dev + on-prem packaging.
- Server route `POST /api/avatars/presign` issues short-lived presigned PUT URLs for upload.
- Server route `GET /api/avatars/$userId` returns a presigned GET URL or a signed CDN URL.
- Frontend component (`update-account-image-container.tsx`) updated to call the new routes — no direct S3 SDK in browser.
- Existing Supabase Storage bucket exported to S3 as a one-shot migration; URL rewriting handled via a redirect rule during grace period.
- RLS on `account_image_uploads` metadata table preserves the existing authorization model (user can upload own avatar; others read).

## 2. Motivation

Supabase Storage depends on Supabase's Kong+Storage service. On-prem means fewer containers; S3/MinIO is the de-facto standard and fits the on-prem packaging goal. Since we only have one bucket and one feature (avatars), the migration is tractable.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- One-shot data migration of all current avatars to S3.
- New uploads go only to S3.
- User flow (upload, display) preserves UX: click-upload, instant preview, no re-login.
- URL structure works in the existing CSP.
- Image transforms (resize for thumbnails) done on-demand via presigned URLs + Lambda@Edge (or MinIO + sharp for on-prem).
- For on-prem: MinIO container ships in docker-compose + Helm chart.

### 3.2 Non-goals (phase 1)

- **Other file types.** Only avatars exist today. Future user uploads (notebook attachments, etc.) get their own RFC.
- **CDN in front** (CloudFront). Phase 2 — nice but not blocking.
- **Customer BYO S3 bucket.** Phase 3.

## 4. Prior art in the codebase

- **Reused**: `update-account-image-container.tsx` component.
- **Replaced**: `client.storage.from('account_image').*` calls.
- **Orthogonal**: all other storage concerns (there are none).

## 5. Conceptual model

Avatar has two pieces:

1. **Blob** — stored in S3 at `avatars/{user_id}/{hash}.{ext}`.
2. **Metadata** — a row in `account_image_uploads` (new table) with `user_id`, `s3_key`, `content_type`, `size`, `uploaded_at`.

RLS on the metadata table mirrors today's Storage RLS (user writes own, everyone reads).

## 6. Security and trust boundaries

- Presigned PUT URLs: 5-minute TTL, size-limited (`Content-Length-Range` policy), MIME allowlist.
- Presigned GET URLs: 1-hour TTL.
- S3 bucket: block-public-access ON, KMS encryption, versioning enabled.
- MinIO parity: same bucket policies, KMS via customer-provided keys if required.

## 7. Rollout plan

| Phase | Scope                                     | Artifacts               | Status |
| ----- | ----------------------------------------- | ----------------------- | ------ |
| 1     | S3 backend + presigned URL flow + migration | This RFC + phase-1 spec | Draft  |
| 2     | CloudFront distribution                    | Phase 2 spec            | Future |

## 8. Open questions

1. **Image transforms.** Lambda@Edge (AWS-only) vs sharp-in-server (portable). Proposal: sharp-in-server with an on-demand cache.
2. **Legacy URL handling.** Do we keep a redirect from old Supabase Storage URLs post-migration? Proposal: yes, 90 days, then hard-fail.
3. **Multipart uploads.** Avatars are small — skip. Future features may need them.
4. **Filename format.** `{user_id}/{hash}.{ext}` vs `{user_id}.{ext}` (overwrite). Proposal: hash-suffixed; lets us keep history if needed.

## 9. Alternatives considered

- **Keep Supabase Storage.** Rejected — extra service for on-prem, conflicts with migration goal.
- **Store avatars in Postgres as bytea.** Rejected — bloats backups; bad for CDN.

## 10. References

- [AWS S3 presigned URL best practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [MinIO S3 compatibility](https://min.io/docs/minio/linux/developers/s3-compatible.html)
