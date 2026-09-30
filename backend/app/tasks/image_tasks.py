from app.core.logger import get_logger
import io
import asyncio
from typing import Tuple
from PIL import Image
from app.core.storage import storage
logger = get_logger(__name__)

def _optimize_and_thumbnail(raw_bytes: bytes) -> Tuple[bytes, bytes]:
    """Synchronous CPU-bound image manipulation executed in worker thread."""
    image = Image.open(io.BytesIO(raw_bytes))
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")

    # Create WebP version
    webp_buf = io.BytesIO()
    image.save(webp_buf, format="WEBP", quality=85, optimize=True)

    # Create 400x400 Thumbnail
    thumb_image = image.copy()
    thumb_image.thumbnail((400, 400))
    thumb_buf = io.BytesIO()
    thumb_image.save(thumb_buf, format="WEBP", quality=80)

    return webp_buf.getvalue(), thumb_buf.getvalue()

async def process_photo_optimization(ctx: dict, photo_key: str) -> dict:
    """
    Downloads raw image from S3, optimizes to WebP, generates thumbnail,
    and uploads derivative to S3.
    """
    try:
        async with storage.get_client() as s3:
            bucket = storage.get_bucket_name("media")
            response = await s3.get_object(Bucket=bucket, Key=photo_key)
            raw_bytes = await response["Body"].read()

        # Run CPU-bound image optimization off the async event loop
        webp_bytes, thumb_bytes = await asyncio.to_thread(_optimize_and_thumbnail, raw_bytes)

        webp_key = f"optimized/{photo_key.rsplit('.', 1)[0]}.webp"
        await storage.upload_bytes(webp_key, webp_bytes, "image/webp")

        thumb_key = f"thumbnails/{photo_key.rsplit('.', 1)[0]}_thumb.webp"
        await storage.upload_bytes(thumb_key, thumb_bytes, "image/webp")

        return {
            "success": True,
            "webp_key": webp_key,
            "thumb_key": thumb_key,
        }
    except Exception as e:
        logger.error(f"{e}")
        return {"success": False, "error": str(e)}
