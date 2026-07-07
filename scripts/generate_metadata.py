import os
import json
import time
from pathlib import Path
from PIL import Image
from google import genai
from google.genai import types
from google.genai.errors import APIError

# Root directories
WORKSPACE_DIR = Path(__file__).resolve().parent.parent
IMAGES_DIR = WORKSPACE_DIR / "Images"
SCRIPTS_DIR = WORKSPACE_DIR / "scripts"
METADATA_FILE = SCRIPTS_DIR / "metadata.json"

# Supported image extensions
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is not set. "
            "Please set it using: $env:GEMINI_API_KEY='your_key' in PowerShell."
        )
    return genai.Client(api_key=api_key)

def build_prompt():
    return (
        "You are an assistant cataloging handmade beaded products for a premium handicraft collection "
        "('Nilima's Collection'). The store currently specializes in 'Toran' (traditional door hangings) "
        "and 'Table Mats' (beaded table mats, coasters, etc.).\n\n"
        "Analyze this image:\n"
        "1. Determine if it is a valid product photo of a Toran or a Table Mat/Coaster.\n"
        "2. If it is a screenshot, blurry, a duplicate, or not a product photo, set status to 'skip' "
        "and provide a reason.\n"
        "3. If it is a valid product photo, set status to 'process' and generate:\n"
        "   - name: A beautiful, appealing title (e.g. 'Golden Swastik Toran', 'Green Leaves Beaded Mat')\n"
        "   - category: Must be exactly 'Toran' or 'Table Mats'.\n"
        "   - price: Estimate a reasonable price in Indian Rupees (INR) (e.g. 199, 299, 499, 799) based on size/complexity.\n"
        "   - description: A short, materials-focused card description (under 15 words).\n"
        "   - details: A detailed description for the product modal (approx 30 words).\n"
        "   - materials: Comma-separated list of materials (e.g. 'Glass beads, cotton thread')."
    )

def generate_metadata():
    print("Initializing Gemini Client...")
    try:
        client = get_gemini_client()
    except Exception as e:
        print(f"Error: {e}")
        return

    SCRIPTS_DIR.mkdir(exist_ok=True)

    # Load existing metadata if any to avoid re-processing
    metadata_map = {}
    if METADATA_FILE.exists():
        try:
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                metadata_map = json.load(f)
            print(f"Loaded {len(metadata_map)} existing metadata records.")
        except Exception as e:
            print(f"Error reading existing metadata.json: {e}. Starting fresh.")

    # Find all images
    all_files = sorted(os.listdir(IMAGES_DIR))
    image_files = []
    
    for f in all_files:
        file_path = IMAGES_DIR / f
        if file_path.is_file() and file_path.suffix.lower() in IMAGE_EXTENSIONS:
            # Automatic skip for filenames containing 'screenshot'
            if "screenshot" in f.lower():
                print(f"File '{f}' identified as screenshot. Will skip during processing.")
                metadata_map[f] = {
                    "status": "skip",
                    "reason": "Filename indicates it is a screenshot"
                }
                continue
            image_files.append(f)

    # Filter out images already processed
    images_to_process = [img for img in image_files if img not in metadata_map]
    
    total = len(images_to_process)
    print(f"Found {len(image_files)} total images. {total} images need metadata generation.")
    
    if total == 0:
        print("No new images to generate metadata for.")
        # Write out updated screenshots mapping
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(metadata_map, f, indent=2, ensure_ascii=False)
        return

    prompt = build_prompt()
    
    # Schema for Structured Outputs
    response_schema = types.Schema(
        type=types.Type.OBJECT,
        properties={
            "status": types.Schema(type=types.Type.STRING, enum=["process", "skip"]),
            "reason": types.Schema(type=types.Type.STRING, description="Reason if status is 'skip'"),
            "name": types.Schema(type=types.Type.STRING, description="Product title"),
            "category": types.Schema(type=types.Type.STRING, enum=["Toran", "Table Mats"]),
            "price": types.Schema(type=types.Type.INTEGER, description="Estimated price in INR"),
            "description": types.Schema(type=types.Type.STRING, description="Short description"),
            "details": types.Schema(type=types.Type.STRING, description="Longer details"),
            "materials": types.Schema(type=types.Type.STRING, description="Materials list"),
        },
        required=["status"]
    )

    count = 0
    for idx, img_name in enumerate(images_to_process, 1):
        img_path = IMAGES_DIR / img_name
        print(f"[{idx}/{total}] Analyzing image: {img_name}...")
        
        retries = 5
        while retries > 0:
            try:
                pil_img = Image.open(img_path)
                
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[pil_img, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=response_schema,
                        temperature=0.2
                    )
                )
                
                data = json.loads(response.text)
                metadata_map[img_name] = data
                print(f" -> Result: {data['status'].upper()} (Name: {data.get('name', 'N/A')})")
                
                # Save progressively after every 5 images in case of crash/rate limits
                count += 1
                if count % 5 == 0:
                    with open(METADATA_FILE, "w", encoding="utf-8") as f:
                        json.dump(metadata_map, f, indent=2, ensure_ascii=False)
                    print("--- Progress saved to metadata.json ---")

                # Pause to respect rate limits (5 RPM limit = 12 seconds per call)
                time.sleep(13.0)
                break
                
            except APIError as ae:
                if ae.code == 429 or "429" in str(ae):
                    print(f"Rate limit hit (429) for {img_name}. Retrying in 35 seconds... (Retries left: {retries - 1})")
                    time.sleep(35.0)
                    retries -= 1
                else:
                    print(f"Gemini API Error for {img_name}: {ae}")
                    metadata_map[img_name] = {
                        "status": "skip",
                        "reason": f"Gemini API Error: {str(ae)}"
                    }
                    break
            except Exception as e:
                print(f"Error processing {img_name}: {e}")
                metadata_map[img_name] = {
                    "status": "skip",
                    "reason": f"Failed to analyze: {str(e)}"
                }
                break
        else:
            print("Skipping image after multiple 429 failures to allow progress.")
            metadata_map[img_name] = {
                "status": "skip",
                "reason": "Exceeded rate limit retries"
            }
            # Add a longer pause before continuing to let the quota reset
            time.sleep(15.0)

    # Final save
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata_map, f, indent=2, ensure_ascii=False)
    print("\nMetadata generation complete. Saved to scripts/metadata.json.")

if __name__ == "__main__":
    generate_metadata()
