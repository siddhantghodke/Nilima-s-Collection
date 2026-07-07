import os
import json
import time
import uuid
import sqlite3
import shutil
from pathlib import Path
from PIL import Image
from rembg import remove

# Root directories
WORKSPACE_DIR = Path(__file__).resolve().parent.parent
IMAGES_DIR = WORKSPACE_DIR / "Images"
SKIPPED_DIR = IMAGES_DIR / "skipped_images"
UPLOADS_DIR = WORKSPACE_DIR / "public" / "uploads" / "products"
METADATA_FILE = WORKSPACE_DIR / "scripts" / "metadata.json"
DB_PATH = WORKSPACE_DIR / "server" / "products.db"

# Public prefix for serving images
PUBLIC_URL_PREFIX = "/uploads/products"

def get_next_sku(cursor):
    """Generates next sequential SKU based on sqlite_sequence and current max id."""
    try:
        cursor.execute("SELECT seq FROM sqlite_sequence WHERE name = 'products'")
        row = cursor.fetchone()
        seq = row[0] if (row and row[0] is not None) else 0
    except Exception:
        seq = 0
        
    cursor.execute("SELECT IFNULL(MAX(id), 0) FROM products")
    max_id = cursor.fetchone()[0]
    
    next_id = max(seq, max_id) + 1
    return f"SKU-{str(next_id).zfill(4)}"

def process_image(img_path, output_path):
    """Removes background, auto-crops transparent edges, resizes to max 1200px, and saves as WebP."""
    print(f" -> Removing background...")
    input_image = Image.open(img_path)
    # Remove background using rembg
    no_bg_image = remove(input_image)
    
    # Auto-crop transparent boundaries
    bbox = no_bg_image.getbbox()
    if bbox:
        no_bg_image = no_bg_image.crop(bbox)
        
    # Resize keeping aspect ratio
    max_size = 1200
    no_bg_image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Ensure parent folder exists
    output_path.parent.mkdir(exist_ok=True, parents=True)
    
    # Save as WebP
    no_bg_image.save(output_path, "WEBP", quality=80)
    print(f" -> Processed image saved to: {output_path.name}")

def import_products():
    # Ensure directories exist
    SKIPPED_DIR.mkdir(exist_ok=True)
    UPLOADS_DIR.mkdir(exist_ok=True, parents=True)

    if not METADATA_FILE.exists():
        print(f"Error: metadata.json not found at {METADATA_FILE}.")
        print("Please run scripts/generate_metadata.py first.")
        return

    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        metadata_map = json.load(f)

    # Establish database connection
    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get list of images in Images/ directory
    all_files = sorted(os.listdir(IMAGES_DIR))
    
    processed_count = 0
    skipped_count = 0

    for filename in all_files:
        img_path = IMAGES_DIR / filename
        if not img_path.is_file():
            continue

        # Handle screenshots automatically
        if "screenshot" in filename.lower():
            print(f"Skipping screenshot file: {filename}")
            try:
                shutil.move(str(img_path), str(SKIPPED_DIR / filename))
                skipped_count += 1
            except Exception as e:
                print(f"Error moving {filename}: {e}")
            continue

        # Get metadata for this file
        meta = metadata_map.get(filename)
        if not meta:
            # If no metadata exists yet, leave it in place so it can be generated later
            print(f"No metadata found for {filename} yet. Leaving in folder for future generation.")
            continue

        # Check skip status from metadata
        if meta.get("status") == "skip":
            reason = meta.get("reason", "Marked as skip in metadata")
            print(f"Skipping {filename}. Reason: {reason}")
            try:
                shutil.move(str(img_path), str(SKIPPED_DIR / filename))
                skipped_count += 1
            except Exception as e:
                print(f"Error moving {filename}: {e}")
            continue

        # Process the image and add to database
        print(f"\nProcessing product image: {filename}")
        
        # Generate unique WebP filename
        unique_id = uuid.uuid4().hex[:8]
        webp_name = f"{int(time.time() * 1000)}-{unique_id}.webp"
        webp_path = UPLOADS_DIR / webp_name
        public_url = f"{PUBLIC_URL_PREFIX}/{webp_name}"

        try:
            # Process image (rembg + Pillow)
            process_image(img_path, webp_path)

            # Insert into products DB
            sku = get_next_sku(cursor)
            name = meta.get("name", f"Handcrafted Item {sku}")
            category = meta.get("category", "Table Mats")
            price = meta.get("price", 299)
            description = meta.get("description", "Handcrafted beaded product.")

            # Ensure category exists in categories table
            cursor.execute("SELECT id FROM categories WHERE name = ?", (category,))
            if not cursor.fetchone():
                print(f" -> Creating new category: {category}")
                cursor.execute("INSERT INTO categories (name) VALUES (?)", (category,))

            # Insert product row
            cursor.execute(
                """
                INSERT INTO products (name, sku, category, price, description)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, sku, category, price, description)
            )
            product_id = cursor.lastrowid

            # Insert product image row (primary = 1)
            cursor.execute(
                """
                INSERT INTO product_images (product_id, image_url, is_primary)
                VALUES (?, ?, 1)
                """,
                (product_id, public_url)
            )

            # Commit transaction for this product
            conn.commit()
            processed_count += 1
            print(f" -> Successfully imported {name} (SKU: {sku}, Price: Rs. {price})")

            # Move original image to skipped/archive folder or delete?
            # The prompt says: "move the skipped images there and I can do it manually".
            # For processed images, let's keep them in a subfolder or leave them, but to make sure
            # they are not re-processed, we should move them to an archive folder inside Images/
            archive_dir = IMAGES_DIR / "processed_archive"
            archive_dir.mkdir(exist_ok=True)
            shutil.move(str(img_path), str(archive_dir / filename))
            
        except Exception as e:
            conn.rollback()
            print(f"Failed to import product from {filename}: {e}")
            try:
                shutil.move(str(img_path), str(SKIPPED_DIR / filename))
                skipped_count += 1
            except Exception as move_err:
                print(f"Could not move to skipped folder: {move_err}")

    conn.close()
    print(f"\nImport job complete.")
    print(f"Processed and added: {processed_count} products.")
    print(f"Skipped / moved to skipped_images: {skipped_count} files.")

if __name__ == "__main__":
    import_products()
