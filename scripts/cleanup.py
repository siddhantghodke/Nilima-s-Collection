import os
import sqlite3
import shutil
from pathlib import Path

# Root directories
WORKSPACE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = WORKSPACE_DIR / "server" / "products.db"
UPLOADS_DIR = WORKSPACE_DIR / "public" / "uploads" / "products"
IMAGES_DIR = WORKSPACE_DIR / "Images"
ARCHIVE_DIR = IMAGES_DIR / "processed_archive"
SKIPPED_DIR = IMAGES_DIR / "skipped_images"

def cleanup():
    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Find product IDs >= 17
    cursor.execute("SELECT id, name FROM products WHERE id >= 17")
    new_products = cursor.fetchall()
    
    if not new_products:
        print("No products with ID >= 17 found in database. Nothing to delete.")
        conn.close()
        return

    print(f"Found {len(new_products)} products to remove:")
    for pid, name in new_products:
        print(f" - ID {pid}: {name}")

    # Find image URLs for these products
    pids = [p[0] for p in new_products]
    placeholders = ",".join("?" for _ in pids)
    
    cursor.execute(
        f"SELECT image_url FROM product_images WHERE product_id IN ({placeholders})",
        pids
    )
    image_rows = cursor.fetchall()
    image_urls = [row[0] for row in image_rows]

    # 1. Delete image files from disk
    print("\nDeleting processed WebP files from disk...")
    deleted_files = 0
    for url in image_urls:
        if url.startswith("/uploads/products/"):
            filename = os.path.basename(url)
            file_path = UPLOADS_DIR / filename
            if file_path.exists():
                try:
                    file_path.unlink()
                    print(f" - Deleted: {filename}")
                    deleted_files += 1
                except Exception as e:
                    print(f" - Failed to delete {filename}: {e}")

    # 2. Delete products from database (ON DELETE CASCADE will clear product_images)
    print("\nDeleting product records from database...")
    cursor.execute(f"DELETE FROM products WHERE id IN ({placeholders})", pids)
    
    # Reset category seeds if we created any new categories that are now empty
    # Let's count products per category and delete any categories with 0 products
    cursor.execute("SELECT name FROM categories")
    categories = [r[0] for r in cursor.fetchall()]
    for cat in categories:
        cursor.execute("SELECT COUNT(*) FROM products WHERE category = ?", (cat,))
        count = cursor.fetchone()[0]
        if count == 0 and cat not in ['Necklaces', 'Bracelets', 'Earrings', 'Toran', 'Table Mats']:
            print(f" - Removing empty category: {cat}")
            cursor.execute("DELETE FROM categories WHERE name = ?", (cat,))

    # Commit changes
    conn.commit()
    conn.close()
    print("Database updates committed successfully.")

    # 3. Move original files back to Images/ from processed_archive and skipped_images
    print("\nRestoring original images back to Images/ directory...")
    restored_count = 0
    
    # Restore from processed_archive
    if ARCHIVE_DIR.exists():
        for filename in os.listdir(ARCHIVE_DIR):
            src_file = ARCHIVE_DIR / filename
            dst_file = IMAGES_DIR / filename
            if src_file.is_file():
                try:
                    shutil.move(str(src_file), str(dst_file))
                    restored_count += 1
                except Exception as e:
                    print(f" - Failed to restore {filename} from archive: {e}")
        
        # Remove empty archive folder
        try:
            ARCHIVE_DIR.rmdir()
        except Exception:
            pass

    # Restore from skipped_images (excluding screenshots)
    if SKIPPED_DIR.exists():
        for filename in os.listdir(SKIPPED_DIR):
            if "screenshot" in filename.lower():
                continue
            src_file = SKIPPED_DIR / filename
            dst_file = IMAGES_DIR / filename
            if src_file.is_file():
                try:
                    shutil.move(str(src_file), str(dst_file))
                    restored_count += 1
                except Exception as e:
                    print(f" - Failed to restore {filename} from skipped: {e}")

    print(f"Cleanup complete. Deleted {deleted_files} files, removed records from database, and restored {restored_count} original photos.")

if __name__ == "__main__":
    cleanup()
