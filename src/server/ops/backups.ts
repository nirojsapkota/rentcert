import "server-only";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

export const BACKUP_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export type BackupLister = (bucket: string) => Promise<Date[]>;

// Lists the modification times of database dumps under postgres/ (written hourly by the host).
const listFromS3: BackupLister = async (bucket) => {
  const client = new S3Client({ region: process.env.AWS_REGION });
  const dates: Date[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "postgres/", ContinuationToken: token }));
    for (const object of page.Contents ?? []) if (object.LastModified) dates.push(object.LastModified);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return dates;
};

// Age of the newest database dump, or null when there is none. Returns undefined when backups
// are not configured (no AWS_BACKUP_BUCKET, as in development).
export async function latestBackupAge(now: Date = new Date(), list: BackupLister = listFromS3): Promise<number | null | undefined> {
  const bucket = process.env.AWS_BACKUP_BUCKET;
  if (!bucket) return undefined;
  const dates = await list(bucket);
  if (dates.length === 0) return null;
  return now.getTime() - Math.max(...dates.map((date) => date.getTime()));
}
