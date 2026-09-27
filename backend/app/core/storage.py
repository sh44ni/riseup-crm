import aioboto3
from typing import Optional, Dict, Any
from app.core.config import settings

class S3StorageService:
    def __init__(self):
        self.session = aioboto3.Session()
        self.endpoint_url = settings.S3_ENDPOINT_URL
        self.access_key = settings.S3_ACCESS_KEY
        self.secret_key = settings.S3_SECRET_KEY
        self.region = settings.S3_REGION
        self.media_bucket = settings.S3_BUCKET_MEDIA
        self.docs_bucket = settings.S3_BUCKET_DOCS

    def get_client(self):
        return self.session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
        )

    def get_bucket_name(self, bucket_type: str = "media") -> str:
        return self.docs_bucket if bucket_type == "docs" else self.media_bucket

    def get_public_url(self, object_key: str, bucket_type: str = "media") -> str:
        bucket = self.get_bucket_name(bucket_type)
        if settings.S3_PUBLIC_URL_BASE:
            return f"{settings.S3_PUBLIC_URL_BASE.rstrip('/')}/{object_key.lstrip('/')}"
        return f"{self.endpoint_url.rstrip('/')}/{bucket}/{object_key.lstrip('/')}"

    async def generate_presigned_upload_url(
        self,
        object_key: str,
        content_type: str,
        bucket_type: str = "media",
        expires_in: int = 900
    ) -> Dict[str, Any]:
        """
        Generates presigned URL for direct browser-to-S3 upload.
        """
        bucket = self.get_bucket_name(bucket_type)
        async with self.get_client() as s3:
            url = await s3.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": bucket,
                    "Key": object_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
            )
            return {
                "upload_url": url,
                "bucket": bucket,
                "key": object_key,
                "public_url": self.get_public_url(object_key, bucket_type),
                "expires_in": expires_in,
            }

    async def generate_presigned_download_url(
        self,
        object_key: str,
        bucket_type: str = "docs",
        expires_in: int = 3600
    ) -> str:
        """
        Generates presigned URL for secure download of documents or private files.
        """
        bucket = self.get_bucket_name(bucket_type)
        async with self.get_client() as s3:
            return await s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": bucket, "Key": object_key},
                ExpiresIn=expires_in,
            )

    async def upload_bytes(
        self,
        object_key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
        bucket_type: str = "media"
    ) -> str:
        """
        Uploads bytes directly to S3.
        """
        bucket = self.get_bucket_name(bucket_type)
        async with self.get_client() as s3:
            await s3.put_object(
                Bucket=bucket,
                Key=object_key,
                Body=data,
                ContentType=content_type,
            )
            return self.get_public_url(object_key, bucket_type)

    async def delete_object(self, object_key: str, bucket_type: str = "media") -> bool:
        bucket = self.get_bucket_name(bucket_type)
        try:
            async with self.get_client() as s3:
                await s3.delete_object(Bucket=bucket, Key=object_key)
                return True
        except Exception:
            return False

storage = S3StorageService()
storage_service = storage
